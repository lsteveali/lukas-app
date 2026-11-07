import { describe, expect, it } from 'vitest';

import {
  availableToWithdraw,
  canDeleteContribution,
  fromSignedAmount,
  toSignedAmount,
} from './contributions';

describe('signed amounts', () => {
  it('stores withdrawals as negative', () => {
    expect(toSignedAmount('deposit', 50_000)).toBe(50_000);
    expect(toSignedAmount('withdrawal', 50_000)).toBe(-50_000);
  });

  it('reads them back as kind + positive amount', () => {
    expect(fromSignedAmount(50_000)).toEqual({ kind: 'deposit', amount: 50_000 });
    expect(fromSignedAmount(-20_000)).toEqual({ kind: 'withdrawal', amount: 20_000 });
  });
});

describe('availableToWithdraw', () => {
  it('is the saved total for a new withdrawal', () => {
    expect(availableToWithdraw(100_000)).toBe(100_000);
  });

  it('adds back the withdrawal being edited', () => {
    expect(availableToWithdraw(100_000, -50_000)).toBe(150_000);
  });

  it('takes out the deposit being turned into a withdrawal', () => {
    expect(availableToWithdraw(100_000, 30_000)).toBe(70_000);
  });

  it('never goes below 0', () => {
    expect(availableToWithdraw(10_000, 30_000)).toBe(0);
  });
});

describe('canDeleteContribution', () => {
  it('allows deleting any withdrawal', () => {
    expect(canDeleteContribution(0, -40_000)).toBe(true);
  });

  it('allows deleting a deposit that is still fully saved', () => {
    expect(canDeleteContribution(100_000, 100_000)).toBe(true);
  });

  it('blocks deleting a deposit whose money was already withdrawn', () => {
    // Deposit 100.000, withdrawal 60.000 → saved 40.000; deleting the deposit → −60.000.
    expect(canDeleteContribution(40_000, 100_000)).toBe(false);
  });
});
