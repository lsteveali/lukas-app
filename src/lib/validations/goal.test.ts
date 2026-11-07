import { describe, expect, it } from 'vitest';

import { goalSchema, type GoalFormValues } from './goal';

const valid: GoalFormValues = {
  name: '  Viaje a Cartagena ',
  targetAmount: '1.500.000',
  deadline: '2027-06-30',
};

const firstMessage = (input: Partial<GoalFormValues>) => {
  const result = goalSchema.safeParse({ ...valid, ...input });
  return result.success ? null : result.error.issues[0]?.message;
};

describe('goalSchema', () => {
  it('parses a valid goal', () => {
    expect(goalSchema.parse(valid)).toEqual({
      name: 'Viaje a Cartagena',
      targetAmount: 1_500_000,
      deadline: '2027-06-30',
    });
  });

  it('treats an empty or missing deadline as null', () => {
    expect(goalSchema.parse({ ...valid, deadline: '' }).deadline).toBeNull();
    expect(goalSchema.parse({ ...valid, deadline: undefined }).deadline).toBeNull();
  });

  it('allows a past deadline (editing an overdue goal)', () => {
    expect(goalSchema.parse({ ...valid, deadline: '2020-01-01' }).deadline).toBe('2020-01-01');
  });

  it('does not output a user_id even if one is sent', () => {
    expect(goalSchema.parse({ ...valid, user_id: 'someone-else' })).not.toHaveProperty('user_id');
  });

  it('requires a name of up to 60 characters', () => {
    expect(firstMessage({ name: '   ' })).toBe('Ponle un nombre a tu meta.');
    expect(firstMessage({ name: 'x'.repeat(61) })).toBe(
      'El nombre puede tener máximo 60 caracteres.',
    );
  });

  it('uses the shared amount rules', () => {
    expect(firstMessage({ targetAmount: '0' })).toBe(
      'Escribe un monto válido, por ejemplo 15.000.',
    );
    expect(firstMessage({ targetAmount: '1.000.000.001' })).toBe(
      'Ese monto parece muy alto, revísalo.',
    );
  });

  it('rejects an invalid deadline', () => {
    expect(firstMessage({ deadline: '2027-02-30' })).toBe('Elige una fecha válida.');
  });
});
