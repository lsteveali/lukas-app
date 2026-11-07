import { describe, expect, it } from 'vitest';

import { getGoalProgress, monthsUntil, toGoal } from './goals';

const TODAY = '2026-11-07';

describe('monthsUntil', () => {
  it('counts the current month', () => {
    expect(monthsUntil(TODAY, '2026-11-30')).toBe(1);
    expect(monthsUntil(TODAY, '2026-12-31')).toBe(2);
  });

  it('crosses years', () => {
    expect(monthsUntil(TODAY, '2027-03-01')).toBe(5);
  });
});

describe('getGoalProgress', () => {
  it('starts at 0 %', () => {
    expect(getGoalProgress({ saved: 0, target: 1_000_000, deadline: null, today: TODAY })).toEqual({
      percent: 0,
      barPercent: 0,
      completed: false,
      remaining: 1_000_000,
      plan: null,
    });
  });

  it('rounds the percentage down so 99.6 % is not shown as complete', () => {
    const progress = getGoalProgress({ saved: 996, target: 1_000, deadline: null, today: TODAY });
    expect(progress.percent).toBe(99);
    expect(progress.completed).toBe(false);
    expect(progress.remaining).toBe(4);
  });

  it('completes exactly at the target', () => {
    const progress = getGoalProgress({ saved: 500, target: 500, deadline: null, today: TODAY });
    expect(progress).toMatchObject({
      percent: 100,
      barPercent: 100,
      completed: true,
      remaining: 0,
    });
  });

  it('keeps the real percentage above 100 but caps the bar', () => {
    const progress = getGoalProgress({ saved: 1_400, target: 1_000, deadline: null, today: TODAY });
    expect(progress).toMatchObject({
      percent: 140,
      barPercent: 100,
      completed: true,
      remaining: 0,
    });
  });

  it('plans the monthly saving, rounded up, counting the current month', () => {
    const progress = getGoalProgress({
      saved: 450_000,
      target: 1_000_000,
      deadline: '2026-12-31',
      today: TODAY,
    });
    expect(progress.plan).toEqual({ status: 'on-track', monthsLeft: 2, perMonth: 275_000 });
  });

  it('rounds the monthly amount up when it does not divide evenly', () => {
    const progress = getGoalProgress({
      saved: 0,
      target: 100_000,
      deadline: '2027-01-15',
      today: TODAY,
    });
    // 100.000 / 3 months = 33.333,3 → 33.334 so 3 payments reach the target.
    expect(progress.plan).toEqual({ status: 'on-track', monthsLeft: 3, perMonth: 33_334 });
  });

  it('treats a deadline later this month as one month left', () => {
    const progress = getGoalProgress({
      saved: 0,
      target: 90_000,
      deadline: '2026-11-30',
      today: TODAY,
    });
    expect(progress.plan).toEqual({ status: 'on-track', monthsLeft: 1, perMonth: 90_000 });
  });

  it('marks a past deadline as overdue', () => {
    const progress = getGoalProgress({
      saved: 10,
      target: 100,
      deadline: '2026-10-31',
      today: TODAY,
    });
    expect(progress.plan).toEqual({ status: 'overdue' });
  });

  it('a deadline of today is still on track', () => {
    const progress = getGoalProgress({ saved: 10, target: 100, deadline: TODAY, today: TODAY });
    expect(progress.plan).toEqual({ status: 'on-track', monthsLeft: 1, perMonth: 90 });
  });

  it('has no plan once completed, even with a past deadline', () => {
    const progress = getGoalProgress({
      saved: 100,
      target: 100,
      deadline: '2026-01-01',
      today: TODAY,
    });
    expect(progress.plan).toBeNull();
  });
});

describe('toGoal', () => {
  const row = {
    id: '9c1d3e5f-7a2b-4c6d-8e1f-2a4b6c8d0e1f',
    name: 'Viaje',
    target_amount: 1_000_000,
    saved_amount: null,
    deadline: null,
  };

  it('maps a view row and defaults saved_amount to 0', () => {
    expect(toGoal(row)).toEqual({
      id: row.id,
      name: 'Viaje',
      targetAmount: 1_000_000,
      savedAmount: 0,
      deadline: null,
    });
  });

  it('drops rows missing required columns', () => {
    expect(toGoal({ ...row, id: null })).toBeNull();
    expect(toGoal({ ...row, name: null })).toBeNull();
    expect(toGoal({ ...row, target_amount: null })).toBeNull();
  });
});
