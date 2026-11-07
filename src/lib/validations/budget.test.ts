import { describe, expect, it } from 'vitest';

import { budgetLimitSchema, budgetSchema, monthParamSchema } from './budget';

const CATEGORY_ID = '3f2b8c1e-5d4a-4b6f-9c2e-1a7d8e9f0b12';

describe('budgetSchema', () => {
  it('parses a category and an integer limit', () => {
    expect(budgetSchema.parse({ categoryId: CATEGORY_ID, limitAmount: '300.000' })).toEqual({
      categoryId: CATEGORY_ID,
      limitAmount: 300_000,
    });
  });

  it('requires a category and a valid amount', () => {
    expect(
      budgetSchema.safeParse({ categoryId: '', limitAmount: '1' }).error?.issues[0]?.message,
    ).toBe('Elige una categoría.');
    expect(
      budgetSchema.safeParse({ categoryId: CATEGORY_ID, limitAmount: '0' }).error?.issues[0]
        ?.message,
    ).toBe('Escribe un monto válido, por ejemplo 15.000.');
  });

  it('never outputs user_id or month', () => {
    const parsed = budgetSchema.parse({
      categoryId: CATEGORY_ID,
      limitAmount: '1.000',
      user_id: 'x',
      month: '2020-01-01',
    });
    expect(parsed).toEqual({ categoryId: CATEGORY_ID, limitAmount: 1_000 });
  });
});

describe('budgetLimitSchema', () => {
  it('only keeps the limit', () => {
    expect(budgetLimitSchema.parse({ limitAmount: '50.000', categoryId: CATEGORY_ID })).toEqual({
      limitAmount: 50_000,
    });
  });
});

describe('monthParamSchema', () => {
  it.each(['2026-11', '2027-01', '2000-12'])('accepts %s', (value) => {
    expect(monthParamSchema.safeParse(value).success).toBe(true);
  });

  it.each(['2026-13', '2026-00', '2026-1', '26-11', '1999-12', 'noviembre', ''])(
    'rejects %j',
    (value) => {
      expect(monthParamSchema.safeParse(value).success).toBe(false);
    },
  );
});
