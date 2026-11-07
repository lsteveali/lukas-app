import { z } from 'zod';

import { CONTRIBUTION_KINDS } from '@/lib/finance/contributions';
import { isValidIsoDate } from '@/lib/utils/dates';

import { positiveAmount } from './money';

export const CONTRIBUTION_NOTE_MAX = 120;

/**
 * Shared by the contribution form and its Server Actions. The amount is always
 * positive here; the kind decides the sign stored in the database. No user_id
 * or goal_id: the owner comes from the session and the goal from the route.
 */
export const contributionSchema = z.object({
  kind: z.enum(CONTRIBUTION_KINDS, { error: 'Elige si es un aporte o un retiro.' }),
  amount: positiveAmount,
  date: z.string().refine(isValidIsoDate, 'Elige una fecha válida.'),
  note: z
    .string()
    .trim()
    .max(CONTRIBUTION_NOTE_MAX, `La nota puede tener máximo ${CONTRIBUTION_NOTE_MAX} caracteres.`)
    .optional()
    .transform((value) => (value ? value : null)),
});

export type ContributionFormValues = z.input<typeof contributionSchema>;
export type ContributionInput = z.output<typeof contributionSchema>;
