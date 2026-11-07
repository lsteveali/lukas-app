import { createClient } from '@/lib/supabase/server';

import { UserMenu } from './UserMenu';

/** Reads the session and profile on the server, then renders the client menu. */
export async function UserMenuLoader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // src/proxy.ts already redirects signed-out users; render nothing meanwhile.
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <UserMenu
      name={profile?.full_name ?? null}
      email={user.email ?? null}
      avatarUrl={profile?.avatar_url ?? null}
    />
  );
}

/** Placeholder with the avatar's size while the session streams in. */
export function UserMenuSkeleton() {
  return <span aria-hidden className="size-8 animate-pulse rounded-full bg-muted" />;
}
