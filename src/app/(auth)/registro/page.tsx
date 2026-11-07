import type { Metadata } from 'next';
import Link from 'next/link';

import { GoogleButton } from '@/components/auth/GoogleButton';
import { RegisterForm } from '@/components/auth/RegisterForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FieldSeparator } from '@/components/ui/field';

export const metadata: Metadata = { title: 'Crear cuenta · Lukas' };

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Crear cuenta</CardTitle>
        <CardDescription>Empieza a llevar tus gastos y los de tu parche.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <GoogleButton />
        <FieldSeparator>o con tu correo</FieldSeparator>
        <RegisterForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?&nbsp;
        <Link href="/login" className="font-medium text-foreground underline">
          Inicia sesión
        </Link>
      </CardFooter>
    </Card>
  );
}
