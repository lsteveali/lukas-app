import { Suspense } from 'react';

import { AppNav } from '@/components/layout/AppNav';
import { UserMenuLoader, UserMenuSkeleton } from '@/components/layout/UserMenuLoader';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav
        userMenu={
          // The session is request-time data: stream the menu in.
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenuLoader />
          </Suspense>
        }
      />
      {/* On phones, leave room for the fixed bottom navigation. */}
      <div className="flex flex-1 flex-col pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] sm:pb-0">
        {children}
      </div>
    </div>
  );
}
