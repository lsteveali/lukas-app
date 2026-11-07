'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Controller, useForm, type FieldPath } from 'react-hook-form';

import { signUp } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PASSWORD_HINT, registerSchema, type RegisterInput } from '@/lib/validations/auth';

type TextField = {
  name: FieldPath<RegisterInput>;
  label: string;
  type: 'text' | 'email' | 'password';
  autoComplete: string;
  placeholder?: string;
  /** Shown under the field while it has no error. */
  hint?: string;
};

const FIELDS: TextField[] = [
  {
    name: 'fullName',
    label: 'Nombre',
    type: 'text',
    autoComplete: 'name',
    placeholder: 'Ana Gómez',
  },
  {
    name: 'email',
    label: 'Correo',
    type: 'email',
    autoComplete: 'email',
    placeholder: 'tu@correo.com',
  },
  {
    name: 'password',
    label: 'Contraseña',
    type: 'password',
    autoComplete: 'new-password',
    hint: PASSWORD_HINT,
  },
  {
    name: 'confirmPassword',
    label: 'Confirma la contraseña',
    type: 'password',
    autoComplete: 'new-password',
  },
];

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await signUp(values);
      if ('error' in result) setServerError(result.error);
      else setEmailSentTo(result.emailSentTo);
    });
  });

  if (emailSentTo) {
    return (
      <div className="flex flex-col items-center gap-3 text-center" role="status">
        <MailCheck className="size-10 text-primary" aria-hidden />
        <p className="font-medium">Revisa tu correo</p>
        <p className="text-sm text-muted-foreground">
          Te enviamos un enlace de confirmación a <strong>{emailSentTo}</strong>. Ábrelo para
          activar tu cuenta. Si no lo ves, revisa la carpeta de spam.
        </p>
        <p className="text-sm text-muted-foreground">
          ¿Ya tenías una cuenta con este correo?{' '}
          <Link href="/login" className="font-medium text-foreground underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    );
  }

  return (
    // method="post" keeps the password out of the URL if submitted before hydration.
    <form method="post" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {FIELDS.map(({ name, label, type, autoComplete, placeholder, hint }) => (
          <Controller
            key={name}
            name={name}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={name}>{label}</FieldLabel>
                <Input
                  {...field}
                  id={name}
                  type={type}
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  hint && <FieldDescription>{hint}</FieldDescription>
                )}
              </Field>
            )}
          />
        ))}
        {serverError && <FieldError>{serverError}</FieldError>}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </FieldGroup>
    </form>
  );
}
