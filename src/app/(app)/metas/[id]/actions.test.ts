import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NEGATIVE_BALANCE_MESSAGE } from '@/lib/finance/contributions';
import { callsTo, resetSupabaseMock, supabaseMock, touchedDb } from '@/test/supabase-mock';

const SESSION_USER = '0b7f2c4e-9a1d-4e3b-8f6a-2c5d7e9f1a3b';
const OTHER_USER = '5e8a1b3c-7d2f-4a6e-9b1c-3d5f7a9b2c4e';
const GOAL_ID = '7d2f4a6e-9b1c-4d5f-8a9b-2c4e5e8a1b3c';
const CONTRIBUTION_ID = '2c4e5e8a-1b3c-4d2f-9a6e-7d2f4a6e9b1c';

const mocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/supabase/server', () => import('@/test/supabase-mock'));

const { addContribution, deleteContribution, updateContribution } = await import('./actions');

const withdrawal = { kind: 'withdrawal', amount: '50.000', date: '2026-11-07', note: 'Tiquetes' };
const deposit = { ...withdrawal, kind: 'deposit', note: '' };
const balanceError = {
  code: '23514',
  message: 'goal_balance_negative',
};

const expectGoalRevalidated = () => {
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/metas');
  expect(mocks.revalidatePath).toHaveBeenCalledWith(`/metas/${GOAL_ID}`);
};

beforeEach(() => {
  resetSupabaseMock(SESSION_USER);
  supabaseMock.affectedRows = [{ id: CONTRIBUTION_ID, goal_id: GOAL_ID }];
  mocks.revalidatePath.mockClear();
});

describe('addContribution', () => {
  it('stores a withdrawal as a negative amount for the session user', async () => {
    expect(await addContribution(GOAL_ID, withdrawal)).toEqual({ ok: true });
    expect(callsTo('from')[0]?.args).toEqual(['goal_contributions']);
    expect(callsTo('insert')[0]?.args[0]).toEqual({
      goal_id: GOAL_ID,
      user_id: SESSION_USER,
      amount: -50_000,
      date: '2026-11-07',
      note: 'Tiquetes',
    });
    expectGoalRevalidated();
  });

  it('stores a deposit as positive with a null note', async () => {
    await addContribution(GOAL_ID, deposit);
    expect(callsTo('insert')[0]?.args[0]).toMatchObject({ amount: 50_000, note: null });
  });

  it('ignores user_id and goal_id sent in the form', async () => {
    await addContribution(GOAL_ID, { ...deposit, user_id: OTHER_USER, goal_id: 'other' });
    expect(callsTo('insert')[0]?.args[0]).toMatchObject({
      user_id: SESSION_USER,
      goal_id: GOAL_ID,
    });
  });

  it('translates the negative-balance trigger error', async () => {
    supabaseMock.error = balanceError;
    expect(await addContribution(GOAL_ID, withdrawal)).toEqual({
      ok: false,
      error: NEGATIVE_BALANCE_MESSAGE,
    });
    expect(NEGATIVE_BALANCE_MESSAGE).toBe(
      'No puedes retirar más de lo que tienes ahorrado en esta meta.',
    );
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('does not confuse other check violations with the balance error', async () => {
    supabaseMock.error = { code: '23514', message: 'goal_contributions_note_check' };
    expect(await addContribution(GOAL_ID, deposit)).toEqual({
      ok: false,
      error: 'No pudimos guardar el aporte. Intenta de nuevo.',
    });
  });

  it('reports a goal of another user (composite FK) as not found', async () => {
    supabaseMock.error = { code: '23503', message: 'violates foreign key constraint' };
    expect(await addContribution(GOAL_ID, deposit)).toEqual({
      ok: false,
      error: 'No se encontró la meta.',
    });
  });

  it('does not touch the database with an invalid goal id or without a session', async () => {
    expect(await addContribution('nope', deposit)).toEqual({
      ok: false,
      error: 'No se encontró la meta.',
    });
    resetSupabaseMock(null);
    expect(await addContribution(GOAL_ID, deposit)).toMatchObject({ ok: false });
    expect(touchedDb()).toBe(false);
  });
});

describe('updateContribution', () => {
  it('updates only amount, date and note, scoped to the session user', async () => {
    expect(await updateContribution(CONTRIBUTION_ID, withdrawal)).toEqual({ ok: true });
    expect(callsTo('update')[0]?.args[0]).toEqual({
      amount: -50_000,
      date: '2026-11-07',
      note: 'Tiquetes',
    });
    expect(callsTo('eq').map((call) => call.args)).toEqual([
      ['id', CONTRIBUTION_ID],
      ['user_id', SESSION_USER],
    ]);
    expect(callsTo('select')[0]?.args).toEqual(['id, goal_id']);
    expectGoalRevalidated();
  });

  it('reports "not found" when RLS lets 0 rows through', async () => {
    supabaseMock.affectedRows = [];
    expect(await updateContribution(CONTRIBUTION_ID, deposit)).toEqual({
      ok: false,
      error: 'No se encontró el aporte.',
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('translates the negative-balance trigger error', async () => {
    supabaseMock.error = balanceError;
    expect(await updateContribution(CONTRIBUTION_ID, withdrawal)).toEqual({
      ok: false,
      error: NEGATIVE_BALANCE_MESSAGE,
    });
  });
});

describe('deleteContribution', () => {
  it('deletes scoped to the session user and revalidates its goal', async () => {
    expect(await deleteContribution(CONTRIBUTION_ID)).toEqual({ ok: true });
    expect(callsTo('delete')).toHaveLength(1);
    expect(callsTo('eq').map((call) => call.args)).toEqual([
      ['id', CONTRIBUTION_ID],
      ['user_id', SESSION_USER],
    ]);
    expectGoalRevalidated();
  });

  it('reports "not found" when RLS lets 0 rows through', async () => {
    supabaseMock.affectedRows = [];
    expect(await deleteContribution(CONTRIBUTION_ID)).toEqual({
      ok: false,
      error: 'No se encontró el aporte.',
    });
  });

  it('translates the negative-balance trigger error (deleting a spent deposit)', async () => {
    supabaseMock.error = balanceError;
    expect(await deleteContribution(CONTRIBUTION_ID)).toEqual({
      ok: false,
      error: NEGATIVE_BALANCE_MESSAGE,
    });
  });

  it('treats an invalid id as not found without touching the database', async () => {
    expect(await deleteContribution('../x')).toEqual({
      ok: false,
      error: 'No se encontró el aporte.',
    });
    expect(touchedDb()).toBe(false);
  });
});
