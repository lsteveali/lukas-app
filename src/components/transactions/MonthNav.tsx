import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { formatMonthLabel, shiftMonth, toMonthParam, type YearMonth } from '@/lib/utils/dates';

type MonthNavProps = {
  month: YearMonth;
  /** Page the links point to, e.g. "/transacciones" or "/dashboard". */
  basePath: '/transacciones' | '/dashboard';
};

/** Previous/next month links. Plain links keep the month in the URL. */
export function MonthNav({ month, basePath }: MonthNavProps) {
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <nav aria-label="Cambiar de mes" className="flex items-center justify-between gap-2">
      <Button asChild variant="outline" size="icon">
        <Link
          href={`${basePath}?mes=${toMonthParam(previous)}`}
          aria-label={`Ver ${formatMonthLabel(previous)}`}
        >
          <ChevronLeft />
        </Link>
      </Button>
      <h2 className="text-lg font-semibold first-letter:uppercase" aria-live="polite">
        {formatMonthLabel(month)}
      </h2>
      <Button asChild variant="outline" size="icon">
        <Link
          href={`${basePath}?mes=${toMonthParam(next)}`}
          aria-label={`Ver ${formatMonthLabel(next)}`}
        >
          <ChevronRight />
        </Link>
      </Button>
    </nav>
  );
}
