import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/utils/redirect';

const ALLOWED_TYPES = new Set<EmailOtpType>(['email', 'signup']);

/**
 * Email confirmation link target. Uses token_hash + verifyOtp so the link
 * works in any browser or device (unlike the PKCE code, which only works in
 * the browser that signed up). Requires the "Confirm signup" email template
 * to point here; see the README / PR for the template.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeNextPath(searchParams.get('next'));

  if (tokenHash && type && ALLOWED_TYPES.has(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error('verifyOtp failed', { code: error.code, status: error.status });
  }

  return NextResponse.redirect(new URL('/login?error=confirm', origin));
}
