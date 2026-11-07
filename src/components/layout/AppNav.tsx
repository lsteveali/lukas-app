'use client';

import { LayoutDashboard, ReceiptText, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { cn } from '@/lib/utils/cn';

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transacciones', label: 'Movimientos', icon: ReceiptText },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Navigation for the private (app) pages: a header on desktop and a fixed
 * bottom bar on phones. Its height is --bottom-nav-height (globals.css).
 */
export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop / tablet: top header. */}
      <header className="hidden border-b sm:block">
        <nav
          aria-label="Principal"
          className="mx-auto flex h-14 w-full max-w-3xl items-center gap-1 px-4"
        >
          <Link href="/dashboard" className="mr-4 text-lg font-bold">
            Lukas
          </Link>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
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
            );
          })}
          <SignOutButton className="ml-auto" />
        </nav>
      </header>

      {/* Phones: fixed bottom bar, within thumb reach. */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <ul className="grid h-(--bottom-nav-height) grid-cols-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
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
          })}
          <li>
            <SignOutButton appearance="tab" />
          </li>
        </ul>
      </nav>
    </>
  );
}
