import { beforeEach, describe, expect, it, vi } from 'vitest';

import { callsTo, resetSupabaseMock, supabaseMock, touchedDb } from '@/test/supabase-mock';

const SESSION_USER = '0b7f2c4e-9a1d-4e3b-8f6a-2c5d7e9f1a3b';
const OTHER_USER = '5e8a1b3c-7d2f-4a6e-9b1c-3d5f7a9b2c4e';
const GOAL_ID = '7d2f4a6e-9b1c-4d5f-8a9b-2c4e5e8a1b3c';

const mocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/supabase/server', () => import('@/test/supabase-mock'));

const { createGoal, deleteGoal, updateGoal } = await import('./actions');

const validInput = { name: 'Viaje', targetAmount: '1.500.000', deadline: '2027-06-30' };

beforeEach(() => {
  resetSupabaseMock(SESSION_USER);
  supabaseMock.affectedRows = [{ id: GOAL_ID }];
  mocks.revalidatePath.mockClear();
});

describe('createGoal', () => {
  it('inserts with the session user and integer pesos', async () => {
    expect(await createGoal(validInput)).toEqual({ ok: true });
    expect(callsTo('from')[0]?.args).toEqual(['goals']);
    expect(callsTo('insert')[0]?.args[0]).toEqual({
      user_id: SESSION_USER,
      name: 'Viaje',
      target_amount: 1_500_000,
      deadline: '2027-06-30',
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/metas');
  });

  it('ignores a user_id sent from the client', async () => {
    await createGoal({ ...validInput, user_id: OTHER_USER });
    expect(callsTo('insert')[0]?.args[0]).toMatchObject({ user_id: SESSION_USER });
  });

  it('does not touch the database with invalid data or without a session', async () => {
    expect(await createGoal({ ...validInput, name: '' })).toMatchObject({ ok: false });
    resetSupabaseMock(null);
    expect(await createGoal(validInput)).toEqual({
      ok: false,
      error: 'Tu sesión expiró. Inicia sesión de nuevo.',
    });
    expect(touchedDb()).toBe(false);
  });
});

describe('updateGoal', () => {
  it('updates scoped to the session user and checks the affected rows', async () => {
    expect(await updateGoal(GOAL_ID, { ...validInput, deadline: '' })).toEqual({ ok: true });
    expect(callsTo('update')[0]?.args[0]).toEqual({
      name: 'Viaje',
      target_amount: 1_500_000,
      deadline: null,
    });
    expect(callsTo('eq').map((call) => call.args)).toEqual([
      ['id', GOAL_ID],
      ['user_id', SESSION_USER],
    ]);
    expect(callsTo('select')).toHaveLength(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/metas');
  });

  it('reports "not found" when RLS lets 0 rows through', async () => {
    supabaseMock.affectedRows = [];
    expect(await updateGoal(GOAL_ID, validInput)).toEqual({
      ok: false,
      error: 'No se encontró la meta.',
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('rejects an invalid id without touching the database', async () => {
    expect(await updateGoal('nope', validInput)).toMatchObject({ ok: false });
    expect(touchedDb()).toBe(false);
  });
});

describe('deleteGoal', () => {
  it('deletes scoped to the session user and checks the affected rows', async () => {
    expect(await deleteGoal(GOAL_ID)).toEqual({ ok: true });
    expect(callsTo('delete')).toHaveLength(1);
    expect(callsTo('eq').map((call) => call.args)).toEqual([
      ['id', GOAL_ID],
      ['user_id', SESSION_USER],
    ]);
    expect(callsTo('select')).toHaveLength(1);
  });

  it('reports "not found" when RLS lets 0 rows through', async () => {
    supabaseMock.affectedRows = [];
    expect(await deleteGoal(GOAL_ID)).toEqual({ ok: false, error: 'No se encontró la meta.' });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('treats an invalid id as not found', async () => {
    expect(await deleteGoal('../x')).toEqual({ ok: false, error: 'No se encontró la meta.' });
    expect(touchedDb()).toBe(false);
  });

  it('requires a session', async () => {
    resetSupabaseMock(null);
    expect(await deleteGoal(GOAL_ID)).toMatchObject({ ok: false });
    expect(touchedDb()).toBe(false);
  });
});
