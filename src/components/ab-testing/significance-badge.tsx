'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SignificanceBadgeProps {
  confidenceLevel: number;
  significant?: boolean;
  className?: string;
}

export function SignificanceBadge({ confidenceLevel, significant, className }: SignificanceBadgeProps) {
  const level = Math.round(confidenceLevel * 10) / 10;

  let variant: 'default' | 'secondary' | 'outline' | 'destructive' = 'secondary';
  let label = `${level}% confianza`;
  let colorClass = 'bg-zinc-100 text-zinc-600';

  if (level >= 95 || significant) {
    variant = 'default';
    colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    label = `${level}% - Significativo`;
  } else if (level >= 80) {
    variant = 'outline';
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
    label = `${level}% - Casi significativo`;
  } else if (level > 0) {
    colorClass = 'bg-zinc-100 text-zinc-500 border-zinc-200';
    label = `${level}% - No significativo`;
  } else {
    label = 'Sin datos';
  }

  return (
    <Badge
      variant={variant}
      className={cn(colorClass, 'font-medium', className)}
    >
      {label}
    </Badge>
  );
}
