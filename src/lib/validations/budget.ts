import { z } from 'zod';

import { positiveAmount } from './money';

/** Create: category + limit. No user_id or month: session and URL provide them. */
export const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Elige una categoría.').pipe(z.uuid('Elige una categoría.')),
  limitAmount: positiveAmount,
});

/** Edit: only the limit can change (same as the database grant). */
export const budgetLimitSchema = z.object({ limitAmount: positiveAmount });

/** Strict `YYYY-MM` for Server Actions (pages fall back to the current month instead). */
export const monthParamSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes inválido.')
  .refine((value) => {
    const year = Number(value.slice(0, 4));
    return year >= 2000 && year <= 2100;
  }, 'Mes inválido.');

export type BudgetFormValues = z.input<typeof budgetSchema>;
export type BudgetInput = z.output<typeof budgetSchema>;
export type BudgetLimitFormValues = z.input<typeof budgetLimitSchema>;
export type BudgetLimitInput = z.output<typeof budgetLimitSchema>;
