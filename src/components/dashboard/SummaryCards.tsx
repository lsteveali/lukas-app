import { ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonthSummary } from '@/lib/finance/summary';
import { cn } from '@/lib/utils/cn';
import { formatCOP } from '@/lib/utils/money';

/** Income, expenses and balance of the month. Stacked on phones. */
export function SummaryCards({ summary }: { summary: MonthSummary }) {
  const balanceIsNegative = summary.balance < 0;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SummaryCard
        title="Ingresos"
        icon={<ArrowUpRight aria-hidden />}
        value={formatCOP(summary.income)}
        valueClassName="text-green-700"
      />
      <SummaryCard
        title="Gastos"
        icon={<ArrowDownRight aria-hidden />}
        value={formatCOP(summary.expense)}
        valueClassName="text-red-600"
      />
      <SummaryCard
        title="Balance"
        icon={<Scale aria-hidden />}
        // Typographic minus, consistent with the transaction list.
        value={`${balanceIsNegative ? '−' : ''}${formatCOP(Math.abs(summary.balance))}`}
        valueClassName={balanceIsNegative ? 'text-red-600' : 'text-green-700'}
        description={balanceIsNegative ? 'Gastaste más de lo que entró' : undefined}
      />
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  icon: React.ReactNode;
  value: string;
  valueClassName: string;
  description?: string;
};

function SummaryCard({ title, icon, value, valueClassName, description }: SummaryCardProps) {
  return (
    // Default size: with size="sm" CardTitle forces text-sm over the big amount.
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5 [&_svg]:size-4">
          {icon}
          {title}
        </CardDescription>
        <CardTitle className={cn('text-2xl font-bold tabular-nums', valueClassName)}>
          {value}
        </CardTitle>
      </CardHeader>
      {description && (
        <CardContent className="text-xs text-muted-foreground">{description}</CardContent>
      )}
    </Card>
  );
}
