-- Initial schema: profiles, categories, transactions.
-- Money is stored as bigint (whole COP). RLS is enabled on every table.

-- =========================================================
-- profiles
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Creates the profile when a user signs up (email/password or Google OAuth).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- categories (user_id null = system default category)
-- =========================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 50),
  icon text,
  color text check (color ~ '^#[0-9A-Fa-f]{6}$'),
  type text not null check (type in ('expense', 'income')),
  created_at timestamptz not null default now(),
  -- One name per type per owner; system categories (user_id null) included.
  unique nulls not distinct (user_id, name, type)
);

create index categories_user_id_idx on public.categories (user_id);

alter table public.categories enable row level security;

create policy "Users can view system and own categories"
  on public.categories for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "Users can create their own categories"
  on public.categories for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own categories"
  on public.categories for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own categories"
  on public.categories for delete to authenticated
  using (user_id = (select auth.uid()));

-- =========================================================
-- transactions
-- =========================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  type text not null check (type in ('expense', 'income')),
  amount bigint not null check (amount > 0),
  date date not null default ((now() at time zone 'America/Bogota')::date),
  description text check (char_length(description) <= 200),
  created_at timestamptz not null default now()
);

create index transactions_user_id_date_idx on public.transactions (user_id, date desc);
create index transactions_category_id_idx on public.transactions (category_id);

alter table public.transactions enable row level security;

create policy "Users can view their own transactions"
  on public.transactions for select to authenticated
  using (user_id = (select auth.uid()));

-- The category must be visible to the user and match the transaction type.
create policy "Users can create their own transactions"
  on public.transactions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      category_id is null
      or exists (
        select 1 from public.categories c
        where c.id = transactions.category_id
          and c.type = transactions.type
          and (c.user_id is null or c.user_id = (select auth.uid()))
      )
    )
  );

create policy "Users can update their own transactions"
  on public.transactions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      category_id is null
      or exists (
        select 1 from public.categories c
        where c.id = transactions.category_id
          and c.type = transactions.type
          and (c.user_id is null or c.user_id = (select auth.uid()))
      )
    )
  );

create policy "Users can delete their own transactions"
  on public.transactions for delete to authenticated
  using (user_id = (select auth.uid()));

-- =========================================================
-- Grants: only signed-in users reach these tables through the API, and only
-- with the privileges listed here (Supabase grants everything by default).
-- =========================================================
revoke all on public.profiles, public.categories, public.transactions from anon;
revoke all on public.profiles, public.categories, public.transactions from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
grant select, insert, update, delete on public.categories, public.transactions to authenticated;
