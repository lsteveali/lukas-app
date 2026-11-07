'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { createTransaction } from '@/app/(app)/transacciones/actions';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { todayInBogota } from '@/lib/utils/dates';
import { formatCOP, parseCOP } from '@/lib/utils/money';
import {
  DESCRIPTION_MAX,
  transactionSchema,
  type TransactionFormValues,
  type TransactionInput,
  type TransactionType,
} from '@/lib/validations/transaction';

import { CategoryIcon } from './CategoryIcon';
import type { CategoryOption } from './types';

type TransactionFormProps = {
  categories: CategoryOption[];
  /** Called after a successful save with the saved date (YYYY-MM-DD). */
  onSaved: (date: string) => void;
};

const emptyValues = (): TransactionFormValues => ({
  type: 'expense',
  amount: '',
  categoryId: '',
  date: todayInBogota(),
  description: '',
});

export function TransactionForm({ categories, onSaved }: TransactionFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<TransactionFormValues, unknown, TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: emptyValues(),
  });

  const type = useWatch({ control: form.control, name: 'type' });
  const amountText = useWatch({ control: form.control, name: 'amount' });
  const amountPreview = parseCOP(amountText ?? '');
  const visibleCategories = categories.filter((category) => category.type === type);

  const submit = form.handleSubmit((values) => {
    startTransition(async () => {
      // Send the raw form values: the Server Action validates them again.
      const result = await createTransaction(form.getValues());
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      form.reset(emptyValues());
      onSaved(values.date);
    });
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setServerError(null);
    return submit(event);
  };

  return (
    <form method="post" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Controller
          name="type"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel className="sr-only">Tipo de movimiento</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                className="w-full"
                value={field.value}
                onValueChange={(value) => {
                  // Radix sends "" when the active item is clicked again; keep a type selected.
                  if (!value || value === field.value) return;
                  field.onChange(value as TransactionType);
                  // Categories belong to one type, so clear the previous choice.
                  form.setValue('categoryId', '', { shouldValidate: false });
                }}
                aria-label="Tipo de movimiento"
              >
                <ToggleGroupItem value="expense" className="flex-1">
                  Gasto
                </ToggleGroupItem>
                <ToggleGroupItem value="income" className="flex-1">
                  Ingreso
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
              <FieldLabel htmlFor="amount">Monto</FieldLabel>
              <Input
                {...field}
                id="amount"
                inputMode="numeric"
                autoComplete="off"
                placeholder="15.000"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                amountPreview !== null &&
                amountPreview > 0 && <FieldDescription>{formatCOP(amountPreview)}</FieldDescription>
              )}
            </Field>
          )}
        />

        <Controller
          name="categoryId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="categoryId">Categoría</FieldLabel>
              <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="categoryId"
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                  onBlur={field.onBlur}
                >
                  <SelectValue placeholder="Elige una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {visibleCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <CategoryIcon
                        icon={category.icon}
                        color={category.color}
                        className="size-6"
                      />
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="date"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="date">Fecha</FieldLabel>
              <Input {...field} id="date" type="date" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="description">Descripción (opcional)</FieldLabel>
              <Input
                {...field}
                value={field.value ?? ''}
                id="description"
                maxLength={DESCRIPTION_MAX}
                placeholder="Almuerzo con el parche"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {serverError && <FieldError>{serverError}</FieldError>}

        {/* Disabled while sending so a double tap cannot create duplicates. */}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar movimiento'}
        </Button>
      </FieldGroup>
    </form>
  );
}
