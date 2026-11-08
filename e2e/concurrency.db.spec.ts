import { expect, test, userClient } from './fixtures';

// Runs in the "db" project (no browser). Two withdrawals arrive at the same
// time on the same goal: the check_goal_balance trigger locks the goal row
// (select … for update) before summing, so only one of them can pass.
const ATTEMPTS = 10;

test('dos retiros simultáneos: solo uno se acepta y la meta nunca queda en negativo', async ({
  testUser,
}) => {
  // Two independent clients, each with its own connection/requests.
  const [first, second] = await Promise.all([userClient(testUser), userClient(testUser)]);

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const { data: goal, error: goalError } = await first
      .from('goals')
      .insert({ user_id: testUser.id, name: `Concurrencia ${attempt}`, target_amount: 1_000_000 })
      .select('id')
      .single();
    expect(goalError).toBeNull();
    const goalId = goal!.id;

    const { error: depositError } = await first
      .from('goal_contributions')
      .insert({ goal_id: goalId, user_id: testUser.id, amount: 100_000 });
    expect(depositError).toBeNull();

    const withdraw = (client: typeof first) =>
      client
        .from('goal_contributions')
        .insert({ goal_id: goalId, user_id: testUser.id, amount: -70_000 });
    const results = await Promise.all([withdraw(first), withdraw(second)]);

    const accepted = results.filter((result) => result.error === null);
    const rejected = results.filter((result) => result.error !== null);
    expect(accepted, `attempt ${attempt}: exactly one withdrawal is accepted`).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.error?.code).toBe('23514');
    expect(rejected[0]?.error?.message).toContain('goal_balance_negative');

    const { data: progress } = await first
      .from('goals_with_progress')
      .select('saved_amount')
      .eq('id', goalId)
      .single();
    expect(progress?.saved_amount).toBe(30_000);
  }
});
