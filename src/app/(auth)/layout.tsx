export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
