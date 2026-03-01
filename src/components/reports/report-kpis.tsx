'use client';

import { Card, CardContent } from '@/components/ui/card';

interface KPI {
  label: string;
  value: string;
  sublabel?: string;
}

interface ReportKPIsProps {
  kpis: {
    impressions: number;
    reach: number;
    clicks: number;
    spend: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpm: number;
    cpa: number;
    frequency: number;
  };
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function ReportKPIs({ kpis }: ReportKPIsProps) {
  const items: KPI[] = [
    { label: 'Impresiones', value: formatNumber(kpis.impressions) },
    { label: 'Alcance', value: formatNumber(kpis.reach) },
    { label: 'Clics', value: formatNumber(kpis.clicks) },
    { label: 'Gasto', value: `$${kpis.spend.toLocaleString()}` },
    { label: 'Conversiones', value: formatNumber(kpis.conversions) },
    { label: 'CTR', value: `${kpis.ctr}%` },
    { label: 'CPC', value: `$${kpis.cpc}` },
    { label: 'CPM', value: `$${kpis.cpm}` },
    { label: 'CPA', value: `$${kpis.cpa}` },
    { label: 'Frecuencia', value: `${kpis.frequency}x` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
