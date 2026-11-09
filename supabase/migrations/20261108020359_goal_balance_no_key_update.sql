-- Fix a deadlock in check_goal_balance found by the e2e concurrency test (#30).
--
-- Each insert into goal_contributions checks the composite FK to goals, which
-- takes FOR KEY SHARE on the goal row. The trigger then asked for FOR UPDATE on
-- that same row. With two concurrent withdrawals, each transaction held KEY
-- SHARE and waited for the other's to upgrade to UPDATE, so Postgres aborted
-- one with 40P01 (deadlock) instead of the 23514 the app turns into a message.
--
-- FOR NO KEY UPDATE still conflicts with itself (the two triggers run one
-- after the other, and the second one sees the first withdrawal), but it does
-- not conflict with FOR KEY SHARE, so the FK checks no longer deadlock.

create or replace function public.check_goal_balance()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  affected_goal uuid;
  saved bigint;
begin
  for affected_goal in
    select distinct goal_id
    from (
      select case when tg_op <> 'INSERT' then old.goal_id end as goal_id
      union all
      select case when tg_op <> 'DELETE' then new.goal_id end
    ) as changed
    where goal_id is not null
  loop
    -- SECURITY INVOKER: the row lock runs with the caller's privileges and
    -- requires UPDATE on at least one column of goals. Keep the
    -- `grant update (...) on public.goals to authenticated`; without it every
    -- contribution would fail with "permission denied for table goals".
    -- NO KEY UPDATE (not UPDATE): serializes concurrent changes to the same
    -- goal without conflicting with the FOR KEY SHARE taken by the FK check.
    perform 1 from public.goals where id = affected_goal for no key update;
    -- The goal itself is being deleted (cascade): nothing left to protect.
    if not found then
      continue;
    end if;

    select coalesce(sum(amount), 0) into saved
    from public.goal_contributions
    where goal_id = affected_goal;

    if saved < 0 then
      raise exception 'goal_balance_negative'
        using errcode = 'check_violation',
              detail = format('Goal %s would have a total of %s', affected_goal, saved);
    end if;
  end loop;
  return null;
end;
$$;
