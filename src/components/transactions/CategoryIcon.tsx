'use client';

import { Circle } from 'lucide-react';
import { DynamicIcon, type IconName } from 'lucide-react/dynamic';

import { cn } from '@/lib/utils/cn';

const DEFAULT_COLOR = '#6B7280';

type CategoryIconProps = {
  icon: string | null;
  color: string | null;
  className?: string;
};

/** Category icon (lucide name stored in the DB) inside a tinted circle. */
export function CategoryIcon({ icon, color, className }: CategoryIconProps) {
  const tint = color ?? DEFAULT_COLOR;
  return (
    <span
      aria-hidden
      className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', className)}
      style={{ backgroundColor: `${tint}1F`, color: tint }}
    >
      {icon ? (
        <DynamicIcon
          name={icon as IconName}
          className="size-4"
          fallback={() => <Circle className="size-4" />}
        />
      ) : (
        <Circle className="size-4" />
      )}
    </span>
  );
}
