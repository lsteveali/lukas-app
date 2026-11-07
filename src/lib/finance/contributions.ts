// Goal contributions are stored signed: positive = deposit, negative =
// withdrawal (integer pesos). Forms always work with a positive amount plus
// a kind, and these helpers convert between both shapes.

export const CONTRIBUTION_KINDS = ['deposit', 'withdrawal'] as const;
export type ContributionKind = (typeof CONTRIBUTION_KINDS)[number];

/** Shown when a change would leave a goal below 0 (form check and DB trigger). */
export const NEGATIVE_BALANCE_MESSAGE =
  'No puedes retirar más de lo que tienes ahorrado en esta meta.';

export type Contribution = {
  id: string;
  /** Signed amount as stored: negative for withdrawals. */
  amount: number;
  date: string;
  note: string | null;
};

export function toSignedAmount(kind: ContributionKind, amount: number): number {
  return kind === 'withdrawal' ? -amount : amount;
}

export function fromSignedAmount(signed: number): { kind: ContributionKind; amount: number } {
  return signed < 0 ? { kind: 'withdrawal', amount: -signed } : { kind: 'deposit', amount: signed };
}

/**
 * How much can be withdrawn right now. When editing an existing contribution,
 * its current effect is taken out first: editing a $ 50.000 withdrawal on a
 * goal with $ 100.000 saved allows up to $ 150.000.
 */
export function availableToWithdraw(saved: number, editingSignedAmount = 0): number {
  return Math.max(saved - editingSignedAmount, 0);
}

/**
 * Whether deleting a contribution keeps the goal at 0 or more. Deleting a
 * deposit whose money was already withdrawn would leave it negative (the
 * database trigger also rejects it; this lets the UI explain it up front).
 */
export function canDeleteContribution(saved: number, signedAmount: number): boolean {
  return saved - signedAmount >= 0;
}
