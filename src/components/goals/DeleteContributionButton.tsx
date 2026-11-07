'use client';

import { Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { deleteContribution } from '@/app/(app)/metas/[id]/actions';
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
import { canDeleteContribution, type Contribution } from '@/lib/finance/contributions';
import type { Goal } from '@/lib/finance/goals';
import { formatLongDate } from '@/lib/utils/dates';
import { formatCOP } from '@/lib/utils/money';

const SPENT_DEPOSIT_MESSAGE =
  'No puedes eliminar este aporte porque ya retiraste parte de ese dinero. Elimina o reduce primero los retiros.';

type DeleteContributionButtonProps = {
  goal: Goal;
  contribution: Contribution;
  label: string;
};

export function DeleteContributionButton({
  goal,
  contribution,
  label,
}: DeleteContributionButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Checked up front so the user gets an explanation instead of a failed
  // request; the database trigger stays as the backstop.
  const allowed = canDeleteContribution(goal.savedAmount, contribution.amount);
  const isWithdrawal = contribution.amount < 0;
  const noun = isWithdrawal ? 'retiro' : 'aporte';

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteContribution(contribution.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${label}`}>
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este {noun}?</AlertDialogTitle>
          <AlertDialogDescription>
            {isWithdrawal ? 'Retiro' : 'Aporte'} de {formatCOP(Math.abs(contribution.amount))} del{' '}
            {formatLongDate(contribution.date)}
            {contribution.note ? ` (${contribution.note})` : ''}. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {!allowed && (
          <p role="alert" className="text-sm text-amber-700">
            {SPENT_DEPOSIT_MESSAGE}
          </p>
        )}
        {error && <FieldError>{error}</FieldError>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {allowed ? 'Cancelar' : 'Entendido'}
          </AlertDialogCancel>
          {/* A plain Button so the dialog stays open until the delete finishes. */}
          <Button variant="destructive" onClick={confirm} disabled={!allowed || isPending}>
            {isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
