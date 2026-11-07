import { describe, expect, it } from 'vitest';

import { contributionSchema, type ContributionFormValues } from './contribution';

const valid: ContributionFormValues = {
  kind: 'withdrawal',
  amount: '50.000',
  date: '2026-11-07',
  note: '  Tiquetes ',
};

const firstMessage = (input: Partial<ContributionFormValues>) => {
  const result = contributionSchema.safeParse({ ...valid, ...input });
  return result.success ? null : result.error.issues[0]?.message;
};

describe('contributionSchema', () => {
  it('parses a valid withdrawal with a positive amount', () => {
    expect(contributionSchema.parse(valid)).toEqual({
      kind: 'withdrawal',
      amount: 50_000,
      date: '2026-11-07',
      note: 'Tiquetes',
    });
  });

  it('stores an empty note as null', () => {
    expect(contributionSchema.parse({ ...valid, note: '  ' }).note).toBeNull();
    expect(contributionSchema.parse({ ...valid, note: undefined }).note).toBeNull();
  });

  it('never outputs goal_id or user_id', () => {
    const parsed = contributionSchema.parse({ ...valid, goal_id: 'x', user_id: 'y' });
    expect(parsed).not.toHaveProperty('goal_id');
    expect(parsed).not.toHaveProperty('user_id');
  });

  it('rejects a negative or zero amount (the kind carries the sign)', () => {
    expect(firstMessage({ amount: '-5.000' })).toBe('Escribe un monto válido, por ejemplo 15.000.');
    expect(firstMessage({ amount: '0' })).toBe('Escribe un monto válido, por ejemplo 15.000.');
  });

  it('validates kind, date and note length', () => {
    expect(firstMessage({ kind: 'gift' as never })).toBe('Elige si es un aporte o un retiro.');
    expect(firstMessage({ date: '2026-02-30' })).toBe('Elige una fecha válida.');
    expect(firstMessage({ note: 'x'.repeat(121) })).toBe(
      'La nota puede tener máximo 120 caracteres.',
    );
  });
});
