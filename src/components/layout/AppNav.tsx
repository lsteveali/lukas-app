'use client';

import { LayoutDashboard, PiggyBank, ReceiptText, Wallet, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

import { cn } from '@/lib/utils/cn';

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/transacciones', label: 'Movimientos', icon: ReceiptText },
  { href: '/metas', label: 'Metas', icon: PiggyBank },
  { href: '/presupuestos', label: 'Presupuestos', icon: Wallet },
];

function isActive(pathname: string | null, href: string) {
  return pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
}

type Variant = 'header' | 'bottom';

/** The links themselves; `pathname` null means "no active item" (Suspense fallback). */
function NavLinks({ variant, pathname }: { variant: Variant; pathname: string | null }) {
  return NAV_ITEMS.map(({ href, label, icon: Icon }) => {
    const active = isActive(pathname, href);
    const link =
      variant === 'header' ? (
        <Link
          key={href}
          href={href}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            active && 'bg-muted text-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ) : (
        <li key={href}>
          <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground',
              active && 'font-semibold text-foreground',
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        </li>
      );
    return link;
  });
}

/**
 * Reads the current path to mark the active link. On dynamic routes
 * (/metas/[id]) the path is request data, so with cacheComponents it must
 * render inside <Suspense>; the fallback shows the same links unmarked.
 */
function ActiveNavLinks({ variant }: { variant: Variant }) {
  const pathname = usePathname();
  return <NavLinks variant={variant} pathname={pathname} />;
}

function Links({ variant }: { variant: Variant }) {
  return (
    <Suspense fallback={<NavLinks variant={variant} pathname={null} />}>
      <ActiveNavLinks variant={variant} />
    </Suspense>
  );
}

/**
 * Navigation for the private (app) pages. A header on every screen size with
 * the user menu (avatar → "Cerrar sesión"); the section links live in the
 * header on desktop and in a fixed bottom bar on phones, whose height is
 * --bottom-nav-height (globals.css).
 */
export function AppNav({ userMenu }: { userMenu: React.ReactNode }) {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-1 px-4">
          <Link href="/dashboard" className="mr-4 text-lg font-bold">
            Lukas
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-1 sm:flex">
            <Links variant="header" />
          </nav>
          <div className="ml-auto flex items-center">{userMenu}</div>
        </div>
      </header>

      {/* Phones: fixed bottom bar, within thumb reach. */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <ul className="grid h-(--bottom-nav-height) grid-cols-4">
          <Links variant="bottom" />
        </ul>
      </nav>
    </>
  );
}
