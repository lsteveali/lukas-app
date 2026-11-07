import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Página no encontrada · Lukas' };

/** Generic 404 in Spanish (Next's default one is in English). */
export default function NotFound() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
      <p className="text-5xl font-bold text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">No encontramos esta página</h1>
      <p className="max-w-xs text-sm text-muted-foreground">Revisa el enlace o vuelve al inicio.</p>
      <Button asChild>
        <Link href="/dashboard">Ir al inicio</Link>
      </Button>
    </main>
  );
}
