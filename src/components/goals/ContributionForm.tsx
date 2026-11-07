'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { addContribution, updateContribution } from '@/app/(app)/metas/[id]/actions';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  availableToWithdraw,
  fromSignedAmount,
  NEGATIVE_BALANCE_MESSAGE,
  toSignedAmount,
  type Contribution,
  type ContributionKind,
} from '@/lib/finance/contributions';
import type { Goal } from '@/lib/finance/goals';
import { todayInBogota } from '@/lib/utils/dates';
import { formatAmountInput, formatCOP, parseCOP } from '@/lib/utils/money';
import {
  CONTRIBUTION_NOTE_MAX,
  contributionSchema,
  type ContributionFormValues,
  type ContributionInput,
} from '@/lib/validations/contribution';

type ContributionFormProps = {
  goal: Goal;
  /** Kind preselected for a new contribution. */
  kind: ContributionKind;
  /** When given, the form edits this contribution. */
  contribution?: Contribution;
  onSaved: () => void;
};

export function ContributionForm({ goal, kind, contribution, onSaved }: ContributionFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const initial = contribution ? fromSignedAmount(contribution.amount) : null;
  const form = useForm<ContributionFormValues, unknown, ContributionInput>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      kind: initial?.kind ?? kind,
      amount: initial ? formatAmountInput(initial.amount) : '',
      date: contribution?.date ?? todayInBogota(),
      note: contribution?.note ?? '',
    },
  });

  const selectedKind = useWatch({ control: form.control, name: 'kind' });
  const amountText = useWatch({ control: form.control, name: 'amount' });
  const amountPreview = parseCOP(amountText ?? '');
  // Editing replaces this contribution, so its current effect is taken out first.
  const currentSigned = contribution?.amount ?? 0;
  const available = availableToWithdraw(goal.savedAmount, currentSigned);

  const submit = form.handleSubmit((values) => {
    // Early, friendly check; the database trigger is the real guarantee.
    const projected = goal.savedAmount - currentSigned + toSignedAmount(values.kind, values.amount);
    if (projected < 0) {
      form.setError('amount', { message: NEGATIVE_BALANCE_MESSAGE });
      return;
    }
    startTransition(async () => {
      const raw = form.getValues();
      const result = contribution
        ? await updateContribution(contribution.id, raw)
        : await addContribution(goal.id, raw);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      onSaved();
    });
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setServerError(null);
    return submit(event);
  };

  const isWithdrawal = selectedKind === 'withdrawal';
  const submitLabel = contribution
    ? 'Guardar cambios'
    : isWithdrawal
      ? 'Registrar retiro'
      : 'Registrar aporte';

  return (
    // method="post": a submit before hydration never puts values in the URL.
    <form method="post" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Controller
          name="kind"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel className="sr-only">Tipo</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                className="w-full"
                value={field.value}
                onValueChange={(value) => {
                  // Radix sends "" when the active item is clicked again.
                  if (value) field.onChange(value as ContributionKind);
                }}
                aria-label="Aporte o retiro"
              >
                <ToggleGroupItem value="deposit" className="flex-1">
                  Aporte
                </ToggleGroupItem>
                <ToggleGroupItem value="withdrawal" className="flex-1">
                  Retiro
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
          )}
        />

        <Controller
          name="amount"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="contribution-amount">Monto</FieldLabel>
              <Input
                {...field}
                id="contribution-amount"
                inputMode="numeric"
                autoComplete="off"
                placeholder="50.000"
                aria-invalid={fieldState.invalid}
                aria-describedby={isWithdrawal ? 'available-to-withdraw' : undefined}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                amountPreview !== null &&
                amountPreview > 0 && <FieldDescription>{formatCOP(amountPreview)}</FieldDescription>
              )}
              {isWithdrawal && (
                <FieldDescription id="available-to-withdraw">
                  Disponible para retirar: <strong>{formatCOP(available)}</strong>
                </FieldDescription>
              )}
            </Field>
          )}
        />

        <Controller
          name="date"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="contribution-date">Fecha</FieldLabel>
              <Input
                {...field}
                id="contribution-date"
                type="date"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="note"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="contribution-note">Nota (opcional)</FieldLabel>
              <Input
                {...field}
                value={field.value ?? ''}
                id="contribution-note"
                maxLength={CONTRIBUTION_NOTE_MAX}
                placeholder={isWithdrawal ? 'Tiquetes' : 'Prima de diciembre'}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {serverError && <FieldError>{serverError}</FieldError>}

        {/* Disabled while sending so a double tap cannot create duplicates. */}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Guardando…' : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
