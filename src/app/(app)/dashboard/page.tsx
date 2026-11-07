import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Inicio · Lukas' };

// Minimal placeholder until the dashboard issue. Route-wide protection will
// move to src/proxy.ts; for now this page checks the session itself.
export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4">
      <header className="flex items-center justify-between gap-4">
        <Suspense fallback={<h1 className="text-2xl font-bold">Hola</h1>}>
          <Greeting />
        </Suspense>
        <SignOutButton />
      </header>
      <p className="text-muted-foreground">Aquí verás el resumen de tus finanzas.</p>
    </main>
  );
}

async function Greeting() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/dashboard');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const firstName = profile?.full_name?.split(' ')[0];
  return <h1 className="text-2xl font-bold">{firstName ? `Hola, ${firstName}` : 'Hola'}</h1>;
}
