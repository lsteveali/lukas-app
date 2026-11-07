import { z } from 'zod';

import { isValidIsoDate } from '@/lib/utils/dates';

import { MAX_AMOUNT, positiveAmount } from './money';

export const MAX_TRANSACTION_AMOUNT = MAX_AMOUNT;
export const DESCRIPTION_MAX = 200;

export const TRANSACTION_TYPES = ['expense', 'income'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

const amount = positiveAmount;

/**
 * Shared by the form and the Server Action. It has no user_id on purpose:
 * the owner always comes from the session on the server.
 */
export const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES, { error: 'Elige si es un gasto o un ingreso.' }),
  amount,
  categoryId: z.string().min(1, 'Elige una categoría.').pipe(z.uuid('Elige una categoría.')),
  date: z.string().refine(isValidIsoDate, 'Elige una fecha válida.'),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, `La descripción puede tener máximo ${DESCRIPTION_MAX} caracteres.`)
    .optional()
    .transform((value) => (value ? value : null)),
});

export type TransactionFormValues = z.input<typeof transactionSchema>;
export type TransactionInput = z.output<typeof transactionSchema>;
