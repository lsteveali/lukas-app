'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { createGoal, updateGoal } from '@/app/(app)/metas/actions';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Goal } from '@/lib/finance/goals';
import { formatAmountInput, formatCOP, parseCOP } from '@/lib/utils/money';
import {
  GOAL_NAME_MAX,
  goalSchema,
  type GoalFormValues,
  type GoalInput,
} from '@/lib/validations/goal';

type GoalFormProps = {
  /** When given, the form edits this goal instead of creating one. */
  goal?: Goal;
  onSaved: () => void;
};

const emptyValues = (): GoalFormValues => ({ name: '', targetAmount: '', deadline: '' });

const valuesFrom = (goal: Goal): GoalFormValues => ({
  name: goal.name,
  targetAmount: formatAmountInput(goal.targetAmount),
  deadline: goal.deadline ?? '',
});

export function GoalForm({ goal, onSaved }: GoalFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<GoalFormValues, unknown, GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: goal ? valuesFrom(goal) : emptyValues(),
  });

  const targetText = useWatch({ control: form.control, name: 'targetAmount' });
  const targetPreview = parseCOP(targetText ?? '');

  const submit = form.handleSubmit(() => {
    startTransition(async () => {
      // Send the raw form values: the Server Action validates them again.
      const raw = form.getValues();
      const result = goal ? await updateGoal(goal.id, raw) : await createGoal(raw);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      if (!goal) form.reset(emptyValues());
      onSaved();
    });
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setServerError(null);
    return submit(event);
  };

  return (
    // method="post": a submit before hydration never puts values in the URL.
    <form method="post" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="goal-name">Nombre</FieldLabel>
              <Input
                {...field}
                id="goal-name"
                maxLength={GOAL_NAME_MAX}
                placeholder="Viaje a Cartagena"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="targetAmount"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="goal-target">¿Cuánto quieres ahorrar?</FieldLabel>
              <Input
                {...field}
                id="goal-target"
                inputMode="numeric"
                autoComplete="off"
                placeholder="1.500.000"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                targetPreview !== null &&
                targetPreview > 0 && <FieldDescription>{formatCOP(targetPreview)}</FieldDescription>
              )}
            </Field>
          )}
        />

        <Controller
          name="deadline"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="goal-deadline">Fecha límite (opcional)</FieldLabel>
              <Input
                {...field}
                value={field.value ?? ''}
                id="goal-deadline"
                type="date"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription>Te diremos cuánto ahorrar cada mes para llegar.</FieldDescription>
              )}
            </Field>
          )}
        />

        {serverError && <FieldError>{serverError}</FieldError>}

        {/* Disabled while sending so a double tap cannot create duplicates. */}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Guardando…' : goal ? 'Guardar cambios' : 'Crear meta'}
        </Button>
      </FieldGroup>
    </form>
  );
}
