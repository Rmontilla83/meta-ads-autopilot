'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SignificanceBadge } from './significance-badge';
import { calculateMultiVariantSignificance } from '@/lib/ab-testing/statistics';
import type { ABTestVariant } from '@/types';

interface VariantMetricsTableProps {
  variants: ABTestVariant[];
  successMetric?: string;
  winnerVariantId?: string | null;
}

const VARIANT_LETTERS = ['A', 'B', 'C', 'D', 'E'];

const VARIANT_COLOR_CLASSES = [
  'text-blue-600',
  'text-emerald-600',
  'text-amber-600',
  'text-purple-600',
  'text-rose-600',
];

export function VariantMetricsTable({ variants, successMetric = 'ctr', winnerVariantId }: VariantMetricsTableProps) {
  // Calculate significance
  const variantMetrics = variants.map((v) => ({
    conversions: v.metrics?.conversions || 0,
    impressions: v.metrics?.impressions || 0,
    spend: v.metrics?.spend || 0,
    clicks: v.metrics?.clicks || 0,
  }));

  const significance = calculateMultiVariantSignificance(variantMetrics, successMetric);

  // Find best values for highlighting
  const maxCtr = Math.max(...variants.map((v) => v.metrics?.ctr || 0));
  const minCpa = Math.min(...variants.filter((v) => (v.metrics?.cpa || 0) > 0).map((v) => v.metrics?.cpa || Infinity));
  const maxClicks = Math.max(...variants.map((v) => v.metrics?.clicks || 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Nivel de confianza:</span>
        <SignificanceBadge
          confidenceLevel={significance.confidenceLevel}
          significant={significance.significant}
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Variante</TableHead>
              <TableHead className="text-right">Impresiones</TableHead>
              <TableHead className="text-right">Clics</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Conversiones</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead className="text-right">CPA</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant, index) => {
              const metrics = variant.metrics || {
                impressions: 0,
                clicks: 0,
                conversions: 0,
                spend: 0,
                ctr: 0,
                cpa: 0,
              };
              const isWinner = winnerVariantId === variant.id || significance.winnerIndex === index;
              const isBestCtr = metrics.ctr === maxCtr && metrics.ctr > 0;
              const isBestCpa = metrics.cpa === minCpa && metrics.cpa > 0;
              const isBestClicks = metrics.clicks === maxClicks && metrics.clicks > 0;
              const letter = VARIANT_LETTERS[index % VARIANT_LETTERS.length];
              const colorClass = VARIANT_COLOR_CLASSES[index % VARIANT_COLOR_CLASSES.length];

              return (
                <TableRow key={variant.id} className={isWinner ? 'bg-emerald-50/50' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`font-bold ${colorClass}`}>
                        {letter}
                      </Badge>
                      <span className="text-sm font-medium truncate max-w-[120px]">
                        {variant.name}
                      </span>
                      {isWinner && (
                        <Badge className="bg-emerald-600 text-white text-xs">
                          Ganador
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {metrics.impressions.toLocaleString()}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${isBestClicks ? 'font-bold text-emerald-600' : ''}`}>
                    {metrics.clicks.toLocaleString()}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${isBestCtr ? 'font-bold text-emerald-600' : ''}`}>
                    {metrics.ctr.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {metrics.conversions}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    ${metrics.spend.toFixed(2)}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${isBestCpa ? 'font-bold text-emerald-600' : ''}`}>
                    {metrics.cpa > 0 ? `$${metrics.cpa.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {variant.meta_adset_id ? (
                      <Badge variant="outline" className="text-xs">
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Borrador
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
