import { AppNav } from '@/components/layout/AppNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppNav />
      {/* On phones, leave room for the fixed bottom navigation. */}
      <div className="flex flex-1 flex-col pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] sm:pb-0">
        {children}
      </div>
    </div>
  );
}
