import { z } from 'zod';

import { parseCOP } from '@/lib/utils/money';

/** Upper bound for any amount typed in a form (transactions, goals, budgets). */
export const MAX_AMOUNT = 1_000_000_000;

/**
 * Amount typed by the user ("15.000", "$ 15.000") → positive integer pesos,
 * at most MAX_AMOUNT. Shared by every money field so the rules and messages
 * stay the same everywhere.
 */
export const positiveAmount = z.string().transform((value, ctx) => {
  const parsed = parseCOP(value);
  if (parsed === null || parsed <= 0) {
    ctx.addIssue({ code: 'custom', message: 'Escribe un monto válido, por ejemplo 15.000.' });
    return z.NEVER;
  }
  if (parsed > MAX_AMOUNT) {
    ctx.addIssue({ code: 'custom', message: 'Ese monto parece muy alto, revísalo.' });
    return z.NEVER;
  }
  return parsed;
});
