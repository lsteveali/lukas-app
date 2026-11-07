'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { createBudget, updateBudget } from '@/app/(app)/presupuestos/actions';
import { CategoryIcon } from '@/components/transactions/CategoryIcon';
import type { CategoryOption } from '@/components/transactions/types';
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
import { formatAmountInput, formatCOP, parseCOP } from '@/lib/utils/money';
import { budgetSchema, type BudgetFormValues, type BudgetInput } from '@/lib/validations/budget';

import type { BudgetView } from './types';

type BudgetFormProps = {
  /** Month of the page, `YYYY-MM`. */
  monthParam: string;
  /** Expense categories that still have no budget this month (create only). */
  categories: CategoryOption[];
  /** When given, edits this budget: only the limit can change. */
  budget?: BudgetView;
  onSaved: () => void;
};

export function BudgetForm({ monthParam, categories, budget, onSaved }: BudgetFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<BudgetFormValues, unknown, BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      categoryId: budget?.categoryId ?? '',
      limitAmount: budget ? formatAmountInput(budget.limitAmount) : '',
    },
  });

  const limitText = useWatch({ control: form.control, name: 'limitAmount' });
  const limitPreview = parseCOP(limitText ?? '');

  const submit = form.handleSubmit(() => {
    startTransition(async () => {
      // Raw values: the Server Action validates them again.
      const raw = form.getValues();
      const result = budget
        ? await updateBudget(budget.id, { limitAmount: raw.limitAmount })
        : await createBudget(monthParam, raw);
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

  return (
    // method="post": a submit before hydration never puts values in the URL.
    <form method="post" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {budget ? (
          // Editing: the category is fixed (only the limit can change).
          <Field>
            <FieldLabel>Categoría</FieldLabel>
            <p className="flex items-center gap-2 text-sm font-medium">
              <CategoryIcon
                icon={budget.category.icon}
                color={budget.category.color}
                className="size-7"
              />
              {budget.category.name}
            </p>
          </Field>
        ) : (
          <Controller
            name="categoryId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="budget-category">Categoría</FieldLabel>
                <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="budget-category"
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder="Elige una categoría de gasto" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
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
        )}

        <Controller
          name="limitAmount"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="budget-limit">Límite del mes</FieldLabel>
              <Input
                {...field}
                id="budget-limit"
                inputMode="numeric"
                autoComplete="off"
                placeholder="300.000"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                limitPreview !== null &&
                limitPreview > 0 && <FieldDescription>{formatCOP(limitPreview)}</FieldDescription>
              )}
            </Field>
          )}
        />

        {serverError && <FieldError>{serverError}</FieldError>}

        {/* Disabled while sending so a double tap cannot create duplicates. */}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Guardando…' : budget ? 'Guardar cambios' : 'Crear presupuesto'}
        </Button>
      </FieldGroup>
    </form>
  );
}
