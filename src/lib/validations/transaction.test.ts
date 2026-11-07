import { describe, expect, it } from 'vitest';

import { transactionSchema, type TransactionFormValues } from './transaction';

const CATEGORY_ID = '3f2b8c1e-5d4a-4b6f-9c2e-1a7d8e9f0b12';

const valid: TransactionFormValues = {
  type: 'expense',
  amount: '15.000',
  categoryId: CATEGORY_ID,
  date: '2026-11-07',
  description: '  Almuerzo  ',
};

const firstMessage = (input: Partial<TransactionFormValues>) => {
  const result = transactionSchema.safeParse({ ...valid, ...input });
  return result.success ? null : result.error.issues[0]?.message;
};

describe('transactionSchema', () => {
  it('parses a valid expense into server-ready values', () => {
    expect(transactionSchema.parse(valid)).toEqual({
      type: 'expense',
      amount: 15000,
      categoryId: CATEGORY_ID,
      date: '2026-11-07',
      description: 'Almuerzo',
    });
  });

  it('accepts the amount formats parseCOP understands', () => {
    expect(transactionSchema.parse({ ...valid, amount: '$ 1.234.567' }).amount).toBe(1234567);
    expect(transactionSchema.parse({ ...valid, amount: '15000' }).amount).toBe(15000);
  });

  it('stores an empty or missing description as null', () => {
    expect(transactionSchema.parse({ ...valid, description: '   ' }).description).toBeNull();
    expect(transactionSchema.parse({ ...valid, description: undefined }).description).toBeNull();
  });

  it('does not output a user_id even if one is sent', () => {
    const parsed = transactionSchema.parse({ ...valid, user_id: 'someone-else' });
    expect(parsed).not.toHaveProperty('user_id');
  });

  it.each(['', '0', 'abc', '15,50', '-5.000'])('rejects the amount %j', (amount) => {
    expect(firstMessage({ amount })).toBe('Escribe un monto válido, por ejemplo 15.000.');
  });

  it('accepts exactly 1.000.000.000', () => {
    expect(transactionSchema.parse({ ...valid, amount: '1.000.000.000' }).amount).toBe(1e9);
  });

  it('rejects amounts above 1.000.000.000', () => {
    expect(firstMessage({ amount: '1.000.000.001' })).toBe('Ese monto parece muy alto, revísalo.');
  });

  it('requires a category', () => {
    expect(firstMessage({ categoryId: '' })).toBe('Elige una categoría.');
    expect(firstMessage({ categoryId: 'not-a-uuid' })).toBe('Elige una categoría.');
  });

  it('requires a valid type and date', () => {
    expect(firstMessage({ type: 'gift' as never })).toBe('Elige si es un gasto o un ingreso.');
    expect(firstMessage({ date: '2026-02-30' })).toBe('Elige una fecha válida.');
  });

  it('limits the description to 200 characters', () => {
    expect(firstMessage({ description: 'x'.repeat(201) })).toBe(
      'La descripción puede tener máximo 200 caracteres.',
    );
  });
});
