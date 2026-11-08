'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { signIn } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useHydrated } from '@/lib/hooks/use-hydrated';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';

type LoginFormProps = {
  next?: string;
  initialError?: string | null;
};

export function LoginForm({ next, initialError = null }: LoginFormProps) {
  const [serverError, setServerError] = useState<string | null>(initialError);
  const [isPending, startTransition] = useTransition();
  // Until hydrated, a submit would be a native POST that reloads the page.
  const hydrated = useHydrated();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await signIn(values, next);
      if (result?.error) setServerError(result.error);
    });
  });

  // Clear any previous error on every attempt, even if field validation fails.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setServerError(null);
    return submit(event);
  };

  return (
    // method="post": if submitted before hydration, the browser must never put
    // the password in the URL (as a default GET submit would).
    <form method="post" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email">Correo</FieldLabel>
              <Input
                {...field}
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="tu@correo.com"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <Input
                {...field}
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {serverError && <FieldError>{serverError}</FieldError>}
        <Button type="submit" className="w-full" disabled={!hydrated || isPending}>
          {isPending ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>
      </FieldGroup>
    </form>
  );
}
