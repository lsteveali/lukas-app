'use client';

import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';

import { FLOATING_ACTION_CLASS } from '@/components/layout/floating';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Goal } from '@/lib/finance/goals';
import { cn } from '@/lib/utils/cn';

import { GoalForm } from './GoalForm';

type NewGoalDialogProps = {
  /** Floating button on phones; a regular button inside the empty state. */
  floating?: boolean;
  triggerLabel?: string;
};

export function NewGoalDialog({
  floating = false,
  triggerLabel = 'Nueva meta',
}: NewGoalDialogProps) {
  const [open, setOpen] = useState(false);
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
          <DialogTitle>Nueva meta</DialogTitle>
          <DialogDescription>¿Para qué estás ahorrando?</DialogDescription>
        </DialogHeader>
        <GoalForm onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditGoalDialog({ goal }: { goal: Goal }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Editar la meta ${goal.name}`}>
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar meta</DialogTitle>
          <DialogDescription>Cambia el nombre, el objetivo o la fecha límite.</DialogDescription>
        </DialogHeader>
        <GoalForm goal={goal} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
