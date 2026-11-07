'use client';

import { useState } from 'react';

import { useNotice } from '@/components/layout/Notice';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { BudgetAlertNotice } from '@/lib/finance/budgets';
import { formatMonthLabel, parseMonthParam } from '@/lib/utils/dates';

import { DeleteTransactionButton } from './DeleteTransactionButton';
import { TransactionForm } from './TransactionForm';
import type { CategoryOption, TransactionListItem } from './types';

type EditTransactionDialogProps = {
  transaction: TransactionListItem;
  categories: CategoryOption[];
  /** Month being viewed (YYYY-MM). */
  currentMonth: string;
  /** Accessible name for the row button, e.g. "Editar Comida, 7 de nov…". */
  label: string;
  /** The row content, rendered as the button that opens the dialog. */
  children: React.ReactNode;
};

export function EditTransactionDialog({
  transaction,
  categories,
  currentMonth,
  label,
  children,
}: EditTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const showNotice = useNotice();

  const handleSaved = (date: string, budgetAlert?: BudgetAlertNotice) => {
    setOpen(false);
    const savedMonth = date.slice(0, 7);
    const moved = savedMonth !== currentMonth;
    const monthLabel = formatMonthLabel(parseMonthParam(savedMonth));

    // A budget crossing matters more: show it, and mention the move if any.
    if (budgetAlert) {
      showNotice({
        tone: budgetAlert.level,
        message: moved ? `${budgetAlert.message} Lo moviste a ${monthLabel}.` : budgetAlert.message,
        href: budgetAlert.href,
        linkLabel: 'Ver presupuestos',
      });
      return;
    }
    // Stay on this month: revalidatePath already removed the row from it.
    // Tell the user where it went so it does not look deleted.
    if (moved) {
      showNotice({
        tone: 'info',
        message: `Movido a ${monthLabel}.`,
        href: `/transacciones?mes=${savedMonth}`,
        linkLabel: `Ver ${monthLabel}`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="flex w-full items-center gap-3 p-3 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {children}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar movimiento</DialogTitle>
          <DialogDescription>Cambia los datos o elimina el movimiento.</DialogDescription>
        </DialogHeader>
        <TransactionForm
          categories={categories}
          transaction={transaction}
          onSaved={handleSaved}
          footer={
            <DeleteTransactionButton transaction={transaction} onDeleted={() => setOpen(false)} />
          }
        />
      </DialogContent>
    </Dialog>
  );
}
