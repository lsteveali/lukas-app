import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/utils/redirect';

/**
 * OAuth (Google) callback: exchanges the PKCE code for a session and sends
 * the user to `next` (same-site paths only) or /dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error('exchangeCodeForSession failed', { code: error.code, status: error.status });
    return NextResponse.redirect(new URL('/login?error=callback', origin));
  }

  // The provider sends ?error=... when the user cancels or access is denied.
  const reason = searchParams.get('error') ? 'google' : 'callback';
  return NextResponse.redirect(new URL(`/login?error=${reason}`, origin));
}
