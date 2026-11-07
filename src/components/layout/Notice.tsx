'use client';

import { AlertTriangle, ArrowRight, Info, OctagonAlert, X } from 'lucide-react';
import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

export const NOTICE_AUTO_HIDE_MS = 8000;

export type NoticeTone = 'info' | 'warning' | 'exceeded';

export type Notice = {
  tone: NoticeTone;
  message: string;
  href?: string;
  linkLabel?: string;
};

const NoticeContext = createContext<(notice: Notice) => void>(() => {});

/** Shows a floating notice from anywhere in the app (e.g. after saving). */
export function useNotice() {
  return useContext(NoticeContext);
}

const TONE: Record<NoticeTone, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: 'border-border' },
  warning: { icon: AlertTriangle, className: 'border-amber-400 [&_svg.tone]:text-amber-600' },
  exceeded: { icon: OctagonAlert, className: 'border-red-400 [&_svg.tone]:text-red-600' },
};

/**
 * One notice at a time, floating above the bottom navigation on phones and in
 * the bottom-right corner on desktop. Lives in the (app) layout so it survives
 * the server re-render that follows a save.
 *
 * Info and warning hide after 8 s; the timer pauses while the pointer is over
 * the notice or focus is inside it. "Exceeded" notices stay until closed.
 */
export function NoticeProvider({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const show = useCallback((next: Notice) => setNotice(next), []);
  const close = useCallback(() => setNotice(null), []);

  return (
    <NoticeContext.Provider value={show}>
      {children}
      {/* Key by message so a new notice restarts its own timer. */}
      {notice && <FloatingNotice key={notice.message} notice={notice} onClose={close} />}
    </NoticeContext.Provider>
  );
}

function FloatingNotice({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  const autoHide = notice.tone !== 'exceeded';
  const remaining = useRef(NOTICE_AUTO_HIDE_MS);
  const startedAt = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;

  useEffect(() => {
    if (!autoHide || paused) return;
    startedAt.current = Date.now();
    const timer = setTimeout(onClose, remaining.current);
    return () => {
      clearTimeout(timer);
      // Keep what was left, so resuming does not restart the full 8 s.
      remaining.current = Math.max(remaining.current - (Date.now() - startedAt.current), 0);
    };
  }, [autoHide, paused, onClose]);

  const { icon: Icon, className } = TONE[notice.tone];

  return (
    <div
      role={notice.tone === 'exceeded' ? 'alert' : 'status'}
      aria-live={notice.tone === 'exceeded' ? 'assertive' : 'polite'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      className={cn(
        // Phones: above the bottom nav and the floating action button.
        'fixed inset-x-4 bottom-[calc(var(--bottom-nav-height)+5rem+env(safe-area-inset-bottom))] z-50',
        // Desktop: bottom-right corner.
        'sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96',
        'flex items-start gap-3 rounded-xl border-2 bg-popover p-3 text-sm text-popover-foreground shadow-lg',
        className,
      )}
    >
      <Icon className="tone mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p>{notice.message}</p>
        {notice.href && (
          <Link
            href={notice.href}
            onClick={onClose}
            className="inline-flex items-center gap-1 self-start font-medium underline"
          >
            {notice.linkLabel ?? 'Ver más'}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Cerrar aviso">
        <X />
      </Button>
    </div>
  );
}
