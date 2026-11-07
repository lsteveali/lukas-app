'use client';

import { LogOut } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import { signOut } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      <LogOut aria-hidden />
      {pending ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </Button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <SubmitButton />
    </form>
  );
}
