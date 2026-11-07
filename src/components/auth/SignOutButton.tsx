'use client';

import { LogOut } from 'lucide-react';
import { useFormStatus } from 'react-dom';

import { signOut } from '@/app/(app)/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

type SignOutButtonProps = {
  /** "tab" renders it as an item of the mobile bottom navigation. */
  appearance?: 'button' | 'tab';
  className?: string;
};

function SubmitButton({ appearance = 'button', className }: SignOutButtonProps) {
  const { pending } = useFormStatus();

  if (appearance === 'tab') {
    return (
      <button
        type="submit"
        disabled={pending}
        className={cn(
          'flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground disabled:opacity-50',
          className,
        )}
      >
        <LogOut className="size-5" aria-hidden />
        {pending ? 'Saliendo…' : 'Salir'}
      </button>
    );
  }

  return (
    <Button type="submit" variant="ghost" disabled={pending} className={className}>
      <LogOut aria-hidden />
      {pending ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </Button>
  );
}

export function SignOutButton(props: SignOutButtonProps) {
  return (
    <form action={signOut} className={props.appearance === 'tab' ? 'h-full' : undefined}>
      <SubmitButton {...props} />
    </form>
  );
}
