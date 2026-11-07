import { PiggyBank } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

/** Shown when the goal id is malformed, does not exist or belongs to someone else. */
export default function GoalNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center">
      <PiggyBank className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-lg font-semibold">No encontramos esta meta</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Puede que la hayas eliminado o que el enlace no sea correcto.
      </p>
      <Button asChild>
        <Link href="/metas">Volver a mis metas</Link>
      </Button>
    </div>
  );
}
