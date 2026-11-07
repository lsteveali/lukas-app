import { beforeEach, describe, expect, it, vi } from 'vitest';

import { callsTo, resetSupabaseMock, supabaseMock, touchedDb } from '@/test/supabase-mock';

const SESSION_USER = '0b7f2c4e-9a1d-4e3b-8f6a-2c5d7e9f1a3b';
const OTHER_USER = '5e8a1b3c-7d2f-4a6e-9b1c-3d5f7a9b2c4e';
const CATEGORY_ID = '3f2b8c1e-5d4a-4b6f-9c2e-1a7d8e9f0b12';
const TRANSACTION_ID = '9c1d3e5f-7a2b-4c6d-8e1f-2a4b6c8d0e1f';

const mocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/supabase/server', () => import('@/test/supabase-mock'));

const { createTransaction, deleteTransaction, updateTransaction } = await import('./actions');

const validInput = {
  type: 'expense',
  amount: '15.000',
  categoryId: CATEGORY_ID,
  date: '2026-11-07',
  description: 'Almuerzo',
};

const expectMoneyPagesRevalidated = () => {
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/transacciones');
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard');
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/presupuestos');
};

beforeEach(() => {
  resetSupabaseMock(SESSION_USER);
  supabaseMock.affectedRows = [{ id: TRANSACTION_ID }];
  mocks.revalidatePath.mockClear();
});

describe('createTransaction', () => {
  it('inserts with the session user and the parsed amount', async () => {
    expect(await createTransaction(validInput)).toEqual({ ok: true });
    expect(callsTo('insert')[0]?.args[0]).toEqual({
      user_id: SESSION_USER,
      type: 'expense',
      amount: 15000,
      category_id: CATEGORY_ID,
      date: '2026-11-07',
      description: 'Almuerzo',
    });
    expectMoneyPagesRevalidated();
  });

  it('ignores a user_id sent from the client', async () => {
    await createTransaction({ ...validInput, user_id: OTHER_USER, userId: OTHER_USER });
    expect(callsTo('insert')[0]?.args[0]).toMatchObject({ user_id: SESSION_USER });
  });

  it('does not insert invalid data', async () => {
    const result = await createTransaction({ ...validInput, amount: '0' });
    expect(result).toEqual({ ok: false, error: 'Revisa los datos del formulario.' });
    expect(touchedDb()).toBe(false);
  });

  it('does not insert without a session', async () => {
    supabaseMock.user = null;
    const result = await createTransaction(validInput);
    expect(result).toEqual({ ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' });
    expect(touchedDb()).toBe(false);
  });

  it('explains an RLS rejection as an invalid category', async () => {
    supabaseMock.error = { code: '42501', message: 'new row violates row-level security policy' };
    expect(await createTransaction(validInput)).toEqual({
      ok: false,
      error: 'La categoría no es válida para este tipo de movimiento.',
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe('updateTransaction', () => {
  it('updates the row scoped to the session user and checks the result', async () => {
    expect(await updateTransaction(TRANSACTION_ID, validInput)).toEqual({ ok: true });
    expect(callsTo('update')[0]?.args[0]).toEqual({
      type: 'expense',
      amount: 15000,
      category_id: CATEGORY_ID,
      date: '2026-11-07',
      description: 'Almuerzo',
    });
    expect(callsTo('eq').map((call) => call.args)).toEqual([
      ['id', TRANSACTION_ID],
      ['user_id', SESSION_USER],
    ]);
    expect(callsTo('select')).toHaveLength(1);
    expectMoneyPagesRevalidated();
  });

  it('never updates user_id, even if the client sends one', async () => {
    await updateTransaction(TRANSACTION_ID, { ...validInput, user_id: OTHER_USER });
    expect(callsTo('update')[0]?.args[0]).not.toHaveProperty('user_id');
  });

  it('reports "not found" when RLS lets 0 rows through (missing or not yours)', async () => {
    supabaseMock.affectedRows = [];
    expect(await updateTransaction(TRANSACTION_ID, validInput)).toEqual({
      ok: false,
      error: 'No se encontró el movimiento.',
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('rejects an invalid id or invalid data without touching the database', async () => {
    expect(await updateTransaction('not-a-uuid', validInput)).toMatchObject({ ok: false });
    expect(await updateTransaction(TRANSACTION_ID, { ...validInput, amount: '' })).toMatchObject({
      ok: false,
    });
    expect(touchedDb()).toBe(false);
  });

  it('requires a session', async () => {
    supabaseMock.user = null;
    expect(await updateTransaction(TRANSACTION_ID, validInput)).toEqual({
      ok: false,
      error: 'Tu sesión expiró. Inicia sesión de nuevo.',
    });
    expect(touchedDb()).toBe(false);
  });

  it('explains an RLS rejection as an invalid category', async () => {
    supabaseMock.error = { code: '42501', message: 'new row violates row-level security policy' };
    expect(await updateTransaction(TRANSACTION_ID, validInput)).toEqual({
      ok: false,
      error: 'La categoría no es válida para este tipo de movimiento.',
    });
  });
});

describe('deleteTransaction', () => {
  it('deletes the row scoped to the session user and checks the result', async () => {
    expect(await deleteTransaction(TRANSACTION_ID)).toEqual({ ok: true });
    expect(callsTo('delete')).toHaveLength(1);
    expect(callsTo('eq').map((call) => call.args)).toEqual([
      ['id', TRANSACTION_ID],
      ['user_id', SESSION_USER],
    ]);
    expect(callsTo('select')).toHaveLength(1);
    expectMoneyPagesRevalidated();
  });

  it('reports "not found" when RLS lets 0 rows through (missing or not yours)', async () => {
    supabaseMock.affectedRows = [];
    expect(await deleteTransaction(TRANSACTION_ID)).toEqual({
      ok: false,
      error: 'No se encontró el movimiento.',
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('treats an invalid id as not found without touching the database', async () => {
    expect(await deleteTransaction('../etc')).toEqual({
      ok: false,
      error: 'No se encontró el movimiento.',
    });
    expect(touchedDb()).toBe(false);
  });

  it('requires a session', async () => {
    supabaseMock.user = null;
    expect(await deleteTransaction(TRANSACTION_ID)).toMatchObject({ ok: false });
    expect(touchedDb()).toBe(false);
  });

  it('returns a generic message on database errors', async () => {
    supabaseMock.error = { code: '57014', message: 'canceling statement due to statement timeout' };
    expect(await deleteTransaction(TRANSACTION_ID)).toEqual({
      ok: false,
      error: 'No pudimos eliminar el movimiento. Intenta de nuevo.',
    });
  });
});
