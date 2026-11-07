import { z } from 'zod';

import { isValidIsoDate } from '@/lib/utils/dates';

import { positiveAmount } from './money';

export const GOAL_NAME_MAX = 60;

/**
 * Shared by the goal form and its Server Actions. No user_id on purpose: the
 * owner always comes from the session on the server.
 */
export const goalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Ponle un nombre a tu meta.')
    .max(GOAL_NAME_MAX, `El nombre puede tener máximo ${GOAL_NAME_MAX} caracteres.`),
  targetAmount: positiveAmount,
  // Optional. Past dates are allowed so an overdue goal can still be edited.
  deadline: z
    .string()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || isValidIsoDate(value), 'Elige una fecha válida.'),
});

export type GoalFormValues = z.input<typeof goalSchema>;
export type GoalInput = z.output<typeof goalSchema>;
