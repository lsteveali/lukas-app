import { beforeEach, describe, expect, it, vi } from 'vitest';

const SESSION_USER = '0b7f2c4e-9a1d-4e3b-8f6a-2c5d7e9f1a3b';
const OTHER_USER = '5e8a1b3c-7d2f-4a6e-9b1c-3d5f7a9b2c4e';
const CATEGORY_ID = '3f2b8c1e-5d4a-4b6f-9c2e-1a7d8e9f0b12';

const mocks = vi.hoisted(() => ({
  user: null as { id: string } | null,
  insertError: null as { code: string; message: string } | null,
  insert: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user }, error: null }) },
    from: () => ({
      insert: async (row: unknown) => {
        mocks.insert(row);
        return { error: mocks.insertError };
      },
    }),
  }),
}));

const { createTransaction } = await import('./actions');

const validInput = {
  type: 'expense',
  amount: '15.000',
  categoryId: CATEGORY_ID,
  date: '2026-11-07',
  description: 'Almuerzo',
};

beforeEach(() => {
  mocks.user = { id: SESSION_USER };
  mocks.insertError = null;
  mocks.insert.mockClear();
  mocks.revalidatePath.mockClear();
});

describe('createTransaction', () => {
  it('inserts with the session user and the parsed amount', async () => {
    const result = await createTransaction(validInput);
    expect(result).toEqual({ ok: true });
    expect(mocks.insert).toHaveBeenCalledWith({
      user_id: SESSION_USER,
      type: 'expense',
      amount: 15000,
      category_id: CATEGORY_ID,
      date: '2026-11-07',
      description: 'Almuerzo',
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/transacciones');
  });

  it('ignores a user_id sent from the client', async () => {
    await createTransaction({ ...validInput, user_id: OTHER_USER, userId: OTHER_USER });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: SESSION_USER }));
  });

  it('does not insert invalid data', async () => {
    const result = await createTransaction({ ...validInput, amount: '0' });
    expect(result).toEqual({ ok: false, error: 'Revisa los datos del formulario.' });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('does not insert without a session', async () => {
    mocks.user = null;
    const result = await createTransaction(validInput);
    expect(result).toEqual({ ok: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('explains an RLS rejection as an invalid category', async () => {
    mocks.insertError = { code: '42501', message: 'new row violates row-level security policy' };
    const result = await createTransaction(validInput);
    expect(result).toEqual({
      ok: false,
      error: 'La categoría no es válida para este tipo de movimiento.',
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
