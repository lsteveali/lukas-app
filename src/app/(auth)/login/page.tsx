import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { GoogleButton } from '@/components/auth/GoogleButton';
import { LoginForm } from '@/components/auth/LoginForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FieldSeparator } from '@/components/ui/field';
import { getLoginPageError } from '@/lib/auth/errors';

export const metadata: Metadata = { title: 'Iniciar sesión · Lukas' };

export default function LoginPage({ searchParams }: PageProps<'/login'>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
        <CardDescription>Entra a Lukas para ver tus finanzas.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* searchParams is request data: under cacheComponents it must stream inside Suspense. */}
        <Suspense fallback={<LoginOptions />}>
          <LoginOptionsFromParams searchParams={searchParams} />
        </Suspense>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        ¿No tienes cuenta?&nbsp;
        <Link href="/registro" className="font-medium text-foreground underline">
          Crea una
        </Link>
      </CardFooter>
    </Card>
  );
}

async function LoginOptionsFromParams({ searchParams }: Pick<PageProps<'/login'>, 'searchParams'>) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;
  const error = typeof params.error === 'string' ? params.error : undefined;
  return <LoginOptions next={next} error={getLoginPageError(error)} />;
}

function LoginOptions({ next, error = null }: { next?: string; error?: string | null }) {
  return (
    <>
      <GoogleButton next={next} />
      <FieldSeparator>o con tu correo</FieldSeparator>
      <LoginForm next={next} initialError={error} />
    </>
  );
}
