'use client';

import { Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { deleteTransaction } from '@/app/(app)/transacciones/actions';
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
import { formatShortDate } from '@/lib/utils/dates';
import { formatCOP } from '@/lib/utils/money';

import type { TransactionListItem } from './types';

type DeleteTransactionButtonProps = {
  transaction: TransactionListItem;
  onDeleted: () => void;
};

export function DeleteTransactionButton({ transaction, onDeleted }: DeleteTransactionButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const kind = transaction.type === 'expense' ? 'Gasto' : 'Ingreso';
  const summary = [
    `${kind} de ${formatCOP(transaction.amount)}`,
    transaction.category?.name,
    formatShortDate(transaction.date),
  ]
    .filter(Boolean)
    .join(' · ');

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteTransaction(transaction.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      onDeleted();
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
        <Button type="button" variant="destructive" className="w-full">
          <Trash2 aria-hidden />
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este movimiento?</AlertDialogTitle>
          <AlertDialogDescription>
            {summary}. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FieldError>{error}</FieldError>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          {/* A plain Button (not AlertDialogAction) so the dialog stays open until the delete finishes. */}
          <Button variant="destructive" onClick={confirm} disabled={isPending}>
            {isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
