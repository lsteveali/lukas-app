'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';

import { TransactionForm } from './TransactionForm';
import type { CategoryOption } from './types';

type NewTransactionDialogProps = {
  categories: CategoryOption[];
  /** Month being viewed (YYYY-MM), to jump to the saved one if it differs. */
  currentMonth: string;
  /** Floating button on phones; a regular button inside the empty state. */
  floating?: boolean;
};

export function NewTransactionDialog({
  categories,
  currentMonth,
  floating = false,
}: NewTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSaved = (date: string) => {
    setOpen(false);
    const savedMonth = date.slice(0, 7);
    // The list already refreshed via revalidatePath; only move if the new
    // transaction belongs to another month.
    if (savedMonth !== currentMonth) router.push(`/transacciones?mes=${savedMonth}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className={cn(
            floating &&
              'fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 rounded-full shadow-lg sm:static sm:rounded-lg sm:shadow-none',
          )}
        >
          <Plus aria-hidden />
          Nuevo movimiento
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
