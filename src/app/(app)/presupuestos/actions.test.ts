import { beforeEach, describe, expect, it, vi } from 'vitest';

import { callsTo, resetSupabaseMock, supabaseMock, touchedDb } from '@/test/supabase-mock';

const SESSION_USER = '0b7f2c4e-9a1d-4e3b-8f6a-2c5d7e9f1a3b';
const OTHER_USER = '5e8a1b3c-7d2f-4a6e-9b1c-3d5f7a9b2c4e';
const CATEGORY_ID = '3f2b8c1e-5d4a-4b6f-9c2e-1a7d8e9f0b12';
const OTHER_CATEGORY = '4f2b8c1e-5d4a-4b6f-9c2e-1a7d8e9f0b12';
const BUDGET_ID = '6a1b3c5d-7e9f-4a2b-8c4d-6e8f0a2b4c6d';

const mocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/supabase/server', () => import('@/test/supabase-mock'));

const { copyPreviousMonthBudgets, createBudget, deleteBudget, updateBudget } =
  await import('./actions');

const input = { categoryId: CATEGORY_ID, limitAmount: '300.000' };

const expectRevalidated = () => {
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/presupuestos');
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard');
};

beforeEach(() => {
  resetSupabaseMock(SESSION_USER);
  supabaseMock.affectedRows = [{ id: BUDGET_ID }];
  mocks.revalidatePath.mockClear();
});

describe('createBudget', () => {
  it('stores the first day of the month for the session user', async () => {
    expect(await createBudget('2026-11', input)).toEqual({ ok: true });
    expect(callsTo('insert')[0]?.args[0]).toEqual({
      user_id: SESSION_USER,
      category_id: CATEGORY_ID,
      limit_amount: 300_000,
      month: '2026-11-01',
    });
    expectRevalidated();
  });

  it('ignores user_id and month sent in the form', async () => {
    await createBudget('2026-11', { ...input, user_id: OTHER_USER, month: '2020-01-01' });
    expect(callsTo('insert')[0]?.args[0]).toMatchObject({
      user_id: SESSION_USER,
      month: '2026-11-01',
    });
  });

  it('translates a duplicate (23505)', async () => {
    supabaseMock.error = { code: '23505', message: 'duplicate key value' };
    expect(await createBudget('2026-11', input)).toEqual({
      ok: false,
      error: 'Ya tienes un presupuesto para esa categoría este mes.',
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('translates an RLS rejection (income or foreign category)', async () => {
    supabaseMock.error = { code: '42501', message: 'new row violates row-level security policy' };
    expect(await createBudget('2026-11', input)).toEqual({
      ok: false,
      error: 'Esa categoría no es válida para un presupuesto.',
    });
  });

  it('rejects an invalid month or missing session without touching the database', async () => {
    expect(await createBudget('2026-13', input)).toMatchObject({ ok: false });
    expect(await createBudget('noviembre', input)).toMatchObject({ ok: false });
    resetSupabaseMock(null);
    expect(await createBudget('2026-11', input)).toMatchObject({ ok: false });
    expect(touchedDb()).toBe(false);
  });
});

describe('updateBudget', () => {
  it('only sends the limit, scoped to the session user', async () => {
    expect(
      await updateBudget(BUDGET_ID, { limitAmount: '350.000', categoryId: OTHER_CATEGORY }),
    ).toEqual({ ok: true });
    expect(callsTo('update')[0]?.args[0]).toEqual({ limit_amount: 350_000 });
    expect(callsTo('eq').map((call) => call.args)).toEqual([
      ['id', BUDGET_ID],
      ['user_id', SESSION_USER],
    ]);
    expect(callsTo('select')).toHaveLength(1);
    expectRevalidated();
  });

  it('reports "not found" when RLS lets 0 rows through', async () => {
    supabaseMock.affectedRows = [];
    expect(await updateBudget(BUDGET_ID, { limitAmount: '1.000' })).toEqual({
      ok: false,
      error: 'No se encontró el presupuesto.',
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe('deleteBudget', () => {
  it('deletes scoped to the session user and checks the affected rows', async () => {
    expect(await deleteBudget(BUDGET_ID)).toEqual({ ok: true });
    expect(callsTo('delete')).toHaveLength(1);
    expect(callsTo('select')).toHaveLength(1);
  });

  it('reports "not found" when RLS lets 0 rows through', async () => {
    supabaseMock.affectedRows = [];
    expect(await deleteBudget(BUDGET_ID)).toEqual({
      ok: false,
      error: 'No se encontró el presupuesto.',
    });
  });

  it('treats an invalid id as not found', async () => {
    expect(await deleteBudget('x')).toEqual({ ok: false, error: 'No se encontró el presupuesto.' });
    expect(touchedDb()).toBe(false);
  });
});

describe('copyPreviousMonthBudgets', () => {
  it('copies last month into this month with ON CONFLICT DO NOTHING', async () => {
    supabaseMock.results = [
      {
        data: [
          { category_id: CATEGORY_ID, limit_amount: 300_000 },
          { category_id: OTHER_CATEGORY, limit_amount: 100_000 },
        ],
        error: null,
      },
      { data: [{ id: 'a' }, { id: 'b' }], error: null },
    ];
    expect(await copyPreviousMonthBudgets('2026-11')).toEqual({ ok: true, copied: 2 });

    // Reads October's budgets of the session user.
    expect(
      callsTo('eq')
        .slice(0, 2)
        .map((call) => call.args),
    ).toEqual([
      ['user_id', SESSION_USER],
      ['month', '2026-10-01'],
    ]);
    const [rows, options] = callsTo('upsert')[0]?.args ?? [];
    expect(rows).toEqual([
      {
        user_id: SESSION_USER,
        category_id: CATEGORY_ID,
        limit_amount: 300_000,
        month: '2026-11-01',
      },
      {
        user_id: SESSION_USER,
        category_id: OTHER_CATEGORY,
        limit_amount: 100_000,
        month: '2026-11-01',
      },
    ]);
    expect(options).toEqual({ onConflict: 'user_id,category_id,month', ignoreDuplicates: true });
    expectRevalidated();
  });

  it('crosses the year: January copies from December', async () => {
    supabaseMock.results = [{ data: [], error: null }];
    await copyPreviousMonthBudgets('2027-01');
    expect(callsTo('eq')[1]?.args).toEqual(['month', '2026-12-01']);
  });

  it('explains when last month has no budgets', async () => {
    supabaseMock.results = [{ data: [], error: null }];
    expect(await copyPreviousMonthBudgets('2026-11')).toEqual({
      ok: false,
      error: 'El mes anterior no tiene presupuestos.',
    });
    expect(callsTo('upsert')).toHaveLength(0);
  });

  it('reports 0 copied when every category already had a budget', async () => {
    supabaseMock.results = [
      { data: [{ category_id: CATEGORY_ID, limit_amount: 1 }], error: null },
      { data: [], error: null },
    ];
    expect(await copyPreviousMonthBudgets('2026-11')).toEqual({ ok: true, copied: 0 });
  });
});
