-- handle_new_user is a SECURITY DEFINER trigger function. Postgres grants
-- EXECUTE to PUBLIC by default, so anon/authenticated could call it through
-- the API (Security Advisor warning). Triggers do not check EXECUTE when they
-- fire, so signups keep creating the profile.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
