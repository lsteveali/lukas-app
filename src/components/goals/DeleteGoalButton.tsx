'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { deleteGoal } from '@/app/(app)/metas/actions';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import type { Goal } from '@/lib/finance/goals';
import { formatCOP } from '@/lib/utils/money';

type DeleteGoalButtonProps = {
  goal: Goal;
  /** Where to go after deleting (e.g. back to /metas from the detail page). */
  redirectTo?: string;
};

export function DeleteGoalButton({ goal, redirectTo }: DeleteGoalButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteGoal(goal.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Keep it open while deleting so the result (or error) is visible.
        if (isPending) return;
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Eliminar la meta ${goal.name}`}>
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar la meta {goal.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {goal.savedAmount > 0 ? (
              <>
                Tiene <strong>{formatCOP(goal.savedAmount)} ahorrados</strong>. Se borrarán la meta
                y todos sus aportes.
              </>
            ) : (
              'Aún no tiene aportes.'
            )}{' '}
            Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FieldError>{error}</FieldError>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          {/* A plain Button so the dialog stays open until the delete finishes. */}
          <Button variant="destructive" onClick={confirm} disabled={isPending}>
            {isPending ? 'Eliminando…' : 'Eliminar meta'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
