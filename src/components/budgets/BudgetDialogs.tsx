'use client';

import { Copy, Pencil, Plus } from 'lucide-react';
import { useState, useTransition } from 'react';

import { copyPreviousMonthBudgets } from '@/app/(app)/presupuestos/actions';
import { FLOATING_ACTION_CLASS } from '@/components/layout/floating';
import type { CategoryOption } from '@/components/transactions/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field';
import { cn } from '@/lib/utils/cn';

import { BudgetForm } from './BudgetForm';
import type { BudgetView } from './types';

type NewBudgetDialogProps = {
  monthParam: string;
  monthLabel: string;
  /** Expense categories without a budget this month. */
  categories: CategoryOption[];
  floating?: boolean;
};

export function NewBudgetDialog({
  monthParam,
  monthLabel,
  categories,
  floating = false,
}: NewBudgetDialogProps) {
  const [open, setOpen] = useState(false);
  const allTaken = categories.length === 0;

  return (
    <div className={cn(floating && 'contents sm:flex sm:flex-col sm:items-end sm:gap-1')}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="lg"
            className={cn(floating && FLOATING_ACTION_CLASS)}
            disabled={allTaken}
            aria-describedby={allTaken ? 'budgets-all-taken' : undefined}
          >
            <Plus aria-hidden />
            Nuevo presupuesto
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo presupuesto</DialogTitle>
            <DialogDescription>Límite de gasto para {monthLabel}.</DialogDescription>
          </DialogHeader>
          <BudgetForm
            monthParam={monthParam}
            categories={categories}
            onSaved={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
      {allTaken && (
        <p id="budgets-all-taken" className="text-xs text-muted-foreground">
          Ya tienes presupuesto en todas tus categorías.
        </p>
      )}
    </div>
  );
}

export function EditBudgetDialog({
  budget,
  monthParam,
}: {
  budget: BudgetView;
  monthParam: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Editar el presupuesto de ${budget.category.name}`}
        >
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar presupuesto</DialogTitle>
          <DialogDescription>Cambia el límite de {budget.category.name}.</DialogDescription>
        </DialogHeader>
        <BudgetForm
          monthParam={monthParam}
          categories={[]}
          budget={budget}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Shown when the month has no budgets and last month had `count` of them. */
export function CopyBudgetsButton({ monthParam, count }: { monthParam: string; count: number }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const copy = () => {
    setError(null);
    startTransition(async () => {
      const result = await copyPreviousMonthBudgets(monthParam);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Disabled while copying; the action is idempotent anyway. */}
      <Button variant="outline" size="lg" onClick={copy} disabled={isPending}>
        <Copy aria-hidden />
        {isPending ? 'Copiando…' : `Copiar presupuestos del mes anterior (${count})`}
      </Button>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
