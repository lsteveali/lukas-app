/**
 * Test double for `@/lib/supabase/server`. Use it from a test with:
 *
 *   vi.mock('@/lib/supabase/server', () => import('@/test/supabase-mock'));
 *   import { supabaseMock, resetSupabaseMock } from '@/test/supabase-mock';
 *
 * Every query-builder call is recorded so tests can assert filters. Awaiting a
 * query resolves to the next entry of `supabaseMock.results` if any was
 * queued, otherwise to `{ data: affectedRows, error }`.
 */

type DbError = { code: string; message: string } | null;
type QueryResult = { data: unknown; error: DbError };

export const supabaseMock = {
  user: null as { id: string } | null,
  error: null as DbError,
  /** Default rows for any awaited query (e.g. `.select()` after update/delete). */
  affectedRows: [] as { id: string; [column: string]: unknown }[],
  /** Per-query results, consumed in order (for actions that run several queries). */
  results: [] as QueryResult[],
  calls: [] as { method: string; args: unknown[] }[],
};

export function resetSupabaseMock(userId: string | null) {
  supabaseMock.user = userId ? { id: userId } : null;
  supabaseMock.error = null;
  supabaseMock.affectedRows = [];
  supabaseMock.results = [];
  supabaseMock.calls = [];
}

export const callsTo = (method: string) =>
  supabaseMock.calls.filter((call) => call.method === method);

export const touchedDb = () => supabaseMock.calls.some((call) => call.method === 'from');

function nextResult(): QueryResult {
  const queued = supabaseMock.results.shift();
  if (queued) return queued;
  return {
    data: supabaseMock.error ? null : supabaseMock.affectedRows,
    error: supabaseMock.error,
  };
}

const CHAIN_METHODS = [
  'select',
  'insert',
  'upsert',
  'update',
  'delete',
  'eq',
  'gte',
  'lt',
  'order',
  'maybeSingle',
];

/** Chainable, awaitable stand-in for the supabase-js query builder. */
function builder() {
  const chain: Record<string, unknown> = {};
  for (const method of CHAIN_METHODS) {
    chain[method] = (...args: unknown[]) => {
      supabaseMock.calls.push({ method, args });
      return chain;
    };
  }
  // Awaiting the chain runs the "query".
  chain.then = (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(nextResult()).then(resolve, reject);
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
