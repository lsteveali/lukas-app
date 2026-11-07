/**
 * Test double for `@/lib/supabase/server`. Use it from a test with:
 *
 *   vi.mock('@/lib/supabase/server', () => import('@/test/supabase-mock'));
 *   import { supabaseMock, resetSupabaseMock } from '@/test/supabase-mock';
 *
 * It records every query-builder call so tests can assert filters, and returns
 * whatever `supabaseMock` is configured with.
 */

type DbError = { code: string; message: string } | null;

export const supabaseMock = {
  user: null as { id: string } | null,
  error: null as DbError,
  /** Rows returned by `.select()` after update/delete (RLS may return none). */
  affectedRows: [] as { id: string; [column: string]: unknown }[],
  calls: [] as { method: string; args: unknown[] }[],
};

export function resetSupabaseMock(userId: string | null) {
  supabaseMock.user = userId ? { id: userId } : null;
  supabaseMock.error = null;
  supabaseMock.affectedRows = [];
  supabaseMock.calls = [];
}

export const callsTo = (method: string) =>
  supabaseMock.calls.filter((call) => call.method === method);

export const touchedDb = () => supabaseMock.calls.some((call) => call.method === 'from');

function builder() {
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      supabaseMock.calls.push({ method, args });
      return chain;
    };
  const chain = {
    update: record('update'),
    delete: record('delete'),
    eq: record('eq'),
    select: (...args: unknown[]) => {
      supabaseMock.calls.push({ method: 'select', args });
      return Promise.resolve({
        data: supabaseMock.error ? null : supabaseMock.affectedRows,
        error: supabaseMock.error,
      });
    },
    insert: (row: unknown) => {
      supabaseMock.calls.push({ method: 'insert', args: [row] });
      return Promise.resolve({ error: supabaseMock.error });
    },
  };
  return chain;
}

export async function createClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: supabaseMock.user }, error: null }),
    },
    from: (table: string) => {
      supabaseMock.calls.push({ method: 'from', args: [table] });
      return builder();
    },
  };
}
