'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * false in the server HTML and until React hydrates this component, true after.
 *
 * Forms that submit through JavaScript (react-hook-form + Server Action)
 * disable their submit button until then: a tap before hydration would do a
 * native POST that reloads the page and loses what the user typed.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
