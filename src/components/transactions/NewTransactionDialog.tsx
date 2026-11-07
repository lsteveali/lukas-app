'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { FLOATING_ACTION_CLASS } from '@/components/layout/floating';
import { useNotice } from '@/components/layout/Notice';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { BudgetAlertNotice } from '@/lib/finance/budgets';
import { cn } from '@/lib/utils/cn';

import { TransactionForm } from './TransactionForm';
import type { CategoryOption } from './types';

type NewTransactionDialogProps = {
  categories: CategoryOption[];
  /** Month being viewed (YYYY-MM), to jump to the saved one if it differs. */
  currentMonth: string;
  /** Floating button on phones; a regular button inside the empty state. */
  floating?: boolean;
  /** Text of the button that opens the dialog. */
  triggerLabel?: string;
  /** Page to show the saved month on, if it differs from the current one. */
  basePath?: '/transacciones' | '/dashboard';
};

export function NewTransactionDialog({
  categories,
  currentMonth,
  floating = false,
  triggerLabel = 'Nuevo movimiento',
  basePath = '/transacciones',
}: NewTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const showNotice = useNotice();

  const handleSaved = (date: string, budgetAlert?: BudgetAlertNotice) => {
    setOpen(false);
    if (budgetAlert) {
      showNotice({
        tone: budgetAlert.level,
        message: budgetAlert.message,
        href: budgetAlert.href,
        linkLabel: 'Ver presupuestos',
      });
    }
    const savedMonth = date.slice(0, 7);
    // The page already refreshed via revalidatePath; only move if the new
    // transaction belongs to another month.
    if (savedMonth !== currentMonth) router.push(`${basePath}?mes=${savedMonth}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className={cn(floating && FLOATING_ACTION_CLASS)}>
          <Plus aria-hidden />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo movimiento</DialogTitle>
          <DialogDescription>Registra un gasto o un ingreso.</DialogDescription>
        </DialogHeader>
        <TransactionForm categories={categories} onSaved={handleSaved} />
      </DialogContent>
    </Dialog>
  );
}
