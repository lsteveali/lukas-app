-- v0.2: savings goals with contributions, and monthly budgets per category.
-- Money is bigint (whole COP). RLS is enabled on every table.

-- =========================================================
-- goals
-- =========================================================
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  target_amount bigint not null check (target_amount > 0),
  deadline date,
  created_at timestamptz not null default now(),
  -- Lets goal_contributions reference (id, user_id), so a contribution can
  -- only ever belong to a goal of the same user.
  unique (id, user_id)
);

create index goals_user_id_idx on public.goals (user_id);

alter table public.goals enable row level security;

create policy "Users can view their own goals"
  on public.goals for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own goals"
  on public.goals for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own goals"
  on public.goals for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own goals"
  on public.goals for delete to authenticated
  using (user_id = (select auth.uid()));

-- =========================================================
-- goal_contributions (positive = deposit, negative = withdrawal)
-- =========================================================
create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null check (amount <> 0),
  date date not null default ((now() at time zone 'America/Bogota')::date),
  note text check (char_length(note) <= 120),
  created_at timestamptz not null default now(),
  -- Same owner as the goal, enforced by the database (not only by RLS).
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade
);

create index goal_contributions_goal_id_date_idx
  on public.goal_contributions (goal_id, date desc);

alter table public.goal_contributions enable row level security;

create policy "Users can view their own contributions"
  on public.goal_contributions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can add contributions to their own goals"
  on public.goal_contributions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own contributions"
  on public.goal_contributions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own contributions"
  on public.goal_contributions for delete to authenticated
  using (user_id = (select auth.uid()));

-- A goal's saved total (sum of its contributions) can never go below 0.
-- A CHECK cannot see other rows, so this runs after each change and re-sums.
--
-- Concurrency: two withdrawals arriving at the same time could each see the
-- old total and both pass. Locking the goal row first serializes them: the
-- second transaction waits for the first to commit, and in READ COMMITTED
-- its following SELECT (a new statement, new snapshot) already sees the
-- first withdrawal.
create function public.check_goal_balance()
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
    -- SECURITY INVOKER: FOR UPDATE runs with the caller's privileges and
    -- requires UPDATE on at least one column of goals. Keep the
    -- `grant update (...) on public.goals to authenticated` below; without it
    -- every contribution would fail with "permission denied for table goals".
    perform 1 from public.goals where id = affected_goal for update;
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

create trigger goal_contributions_balance
  after insert or update or delete on public.goal_contributions
  for each row execute function public.check_goal_balance();

-- Goals with their saved total. security_invoker makes the view apply the
-- caller's RLS on goals and goal_contributions.
create view public.goals_with_progress
with (security_invoker = true) as
  select
    g.id,
    g.user_id,
    g.name,
    g.target_amount,
    g.deadline,
    g.created_at,
    coalesce(sum(c.amount), 0)::bigint as saved_amount
  from public.goals g
  left join public.goal_contributions c on c.goal_id = g.id
  group by g.id;

-- =========================================================
-- budgets (monthly limit per expense category)
-- =========================================================
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  limit_amount bigint not null check (limit_amount > 0),
  -- Always the first day of the month.
  month date not null check (extract(day from month) = 1),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

create index budgets_category_id_idx on public.budgets (category_id);

alter table public.budgets enable row level security;

create policy "Users can view their own budgets"
  on public.budgets for select to authenticated
  using (user_id = (select auth.uid()));

-- Same rule as transactions: the category must be visible to the user
-- (system or own) and, for a budget, an expense category.
create policy "Users can create budgets for their expense categories"
  on public.budgets for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.categories c
      where c.id = budgets.category_id
        and c.type = 'expense'
        and (c.user_id is null or c.user_id = (select auth.uid()))
    )
  );

create policy "Users can update their own budgets"
  on public.budgets for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.categories c
      where c.id = budgets.category_id
        and c.type = 'expense'
        and (c.user_id is null or c.user_id = (select auth.uid()))
    )
  );

create policy "Users can delete their own budgets"
  on public.budgets for delete to authenticated
  using (user_id = (select auth.uid()));

-- =========================================================
-- Grants: only signed-in users, and only the columns they may change.
-- =========================================================
revoke all on public.goals, public.goal_contributions, public.budgets, public.goals_with_progress
  from anon, authenticated;

grant select, insert, delete on public.goals to authenticated;
grant update (name, target_amount, deadline) on public.goals to authenticated;

grant select, insert, delete on public.goal_contributions to authenticated;
grant update (amount, date, note) on public.goal_contributions to authenticated;

grant select, insert, delete on public.budgets to authenticated;
grant update (limit_amount) on public.budgets to authenticated;

grant select on public.goals_with_progress to authenticated;
