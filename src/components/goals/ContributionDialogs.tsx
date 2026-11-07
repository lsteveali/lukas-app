'use client';

import { Minus, Pencil, Plus } from 'lucide-react';
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
import type { Contribution, ContributionKind } from '@/lib/finance/contributions';
import type { Goal } from '@/lib/finance/goals';

import { ContributionForm } from './ContributionForm';

/** "Aportar" / "Retirar" buttons on the goal detail page. */
export function AddContributionDialog({ goal, kind }: { goal: Goal; kind: ContributionKind }) {
  const [open, setOpen] = useState(false);
  const isWithdrawal = kind === 'withdrawal';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isWithdrawal ? 'outline' : 'default'} size="lg">
          {isWithdrawal ? <Minus aria-hidden /> : <Plus aria-hidden />}
          {isWithdrawal ? 'Retirar' : 'Aportar'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isWithdrawal ? 'Retirar de' : 'Aportar a'} {goal.name}
          </DialogTitle>
          <DialogDescription>
            {isWithdrawal ? 'Saca dinero de esta meta.' : 'Suma lucas a esta meta.'}
          </DialogDescription>
        </DialogHeader>
        <ContributionForm goal={goal} kind={kind} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

type EditContributionDialogProps = {
  goal: Goal;
  contribution: Contribution;
  label: string;
};

export function EditContributionDialog({ goal, contribution, label }: EditContributionDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Editar ${label}`}>
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {contribution.amount < 0 ? 'retiro' : 'aporte'}</DialogTitle>
          <DialogDescription>{goal.name}</DialogDescription>
        </DialogHeader>
        <ContributionForm
          goal={goal}
          kind={contribution.amount < 0 ? 'withdrawal' : 'deposit'}
          contribution={contribution}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
