'use client';

import { Cell, Pie, PieChart } from 'recharts';

import type { ExpenseSlice } from '@/lib/finance/summary';
import { formatCOP } from '@/lib/utils/money';

const SIZE = 220;

/**
 * Donut of expenses by category, coloured with each category's colour.
 * Decorative for assistive tech: the legend next to it carries the same data
 * (name, amount, percentage), so nothing depends on colour alone.
 */
export function ExpensesDonut({ slices, total }: { slices: ExpenseSlice[]; total: number }) {
  return (
    <div className="relative mx-auto size-[220px] shrink-0" aria-hidden>
      <PieChart width={SIZE} height={SIZE}>
        <Pie
          data={slices}
          dataKey="amount"
          nameKey="name"
          innerRadius={68}
          outerRadius={104}
          paddingAngle={slices.length > 1 ? 2 : 0}
          stroke="none"
          isAnimationActive={false}
        >
          {slices.map((slice) => (
            <Cell key={slice.key} fill={slice.color} />
          ))}
        </Pie>
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-muted-foreground">Gastos</span>
        <span className="text-base font-bold tabular-nums">{formatCOP(total)}</span>
      </div>
    </div>
  );
}
