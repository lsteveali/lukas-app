'use client';

import { ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

const AUTO_HIDE_MS = 8000;

type Notice = { message: string; href: string; linkLabel: string };

const NoticeContext = createContext<(notice: Notice) => void>(() => {});

/** Shows a short message (e.g. "Movido a diciembre de 2026") from any row. */
export function useMovedNotice() {
  return useContext(NoticeContext);
}

/**
 * Wraps the month view. Keeps the notice in client state, so it survives the
 * server re-render that removes the moved transaction from the list.
 */
export function MovedNoticeProvider({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const show = useCallback((next: Notice) => setNotice(next), []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <NoticeContext.Provider value={show}>
      <div role="status" aria-live="polite">
        {notice && (
          <div className="flex items-center gap-3 rounded-xl border bg-muted/50 px-3 py-2 text-sm">
            <p className="flex-1">{notice.message}</p>
            <Link
              href={notice.href}
              className="inline-flex items-center gap-1 font-medium underline"
              onClick={() => setNotice(null)}
            >
              {notice.linkLabel}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setNotice(null)}
              aria-label="Cerrar aviso"
            >
              <X />
            </Button>
          </div>
        )}
      </div>
      {children}
    </NoticeContext.Provider>
  );
}
