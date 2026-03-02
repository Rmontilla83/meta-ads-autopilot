'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  MousePointerClick,
  ShoppingCart,
  DollarSign,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';

interface StageMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  name?: string;
}

interface FunnelMetricsPanelProps {
  stages: Record<'tofu' | 'mofu' | 'bofu', StageMetrics>;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

const STAGE_META = {
  tofu: {
    label: 'TOFU',
    icon: Eye,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500/30',
  },
  mofu: {
    label: 'MOFU',
    icon: MousePointerClick,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-500/30',
  },
  bofu: {
    label: 'BOFU',
    icon: ShoppingCart,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-500/30',
  },
};

export function FunnelMetricsPanel({ stages }: FunnelMetricsPanelProps) {
  const totalSpend = stages.tofu.spend + stages.mofu.spend + stages.bofu.spend;
  const totalConversions = stages.bofu.conversions;
  const costPerConversion = totalConversions > 0 ? totalSpend / totalConversions : 0;

  // Conversion rates
  const tofuToMofu = stages.tofu.clicks > 0
    ? ((stages.mofu.clicks / stages.tofu.clicks) * 100)
    : 0;
  const mofuToBofu = stages.mofu.clicks > 0
    ? ((stages.bofu.clicks / stages.mofu.clicks) * 100)
    : 0;

  const stageKeys = ['tofu', 'mofu', 'bofu'] as const;

  // Calculate funnel bar widths relative to TOFU impressions
  const maxImpressions = Math.max(stages.tofu.impressions, 1);
  const getBarWidth = (impressions: number) => {
    const pct = Math.max((impressions / maxImpressions) * 100, 15);
    return `${pct}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          Rendimiento del Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Gasto Total</p>
            <p className="text-xl font-bold flex items-center justify-center gap-1">
              <DollarSign className="h-4 w-4" />
              {totalSpend.toFixed(2)}
            </p>
          </div>
          <div className="text-center bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Conversiones</p>
            <p className="text-xl font-bold">{totalConversions}</p>
          </div>
          <div className="text-center bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Costo/Conversion</p>
            <p className="text-xl font-bold">
              ${costPerConversion.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Visual Funnel with bars */}
        <div className="space-y-3">
          {stageKeys.map((stageKey, index) => {
            const meta = STAGE_META[stageKey];
            const data = stages[stageKey];
            const Icon = meta.icon;

            return (
              <div key={stageKey}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                  <span className="text-xs font-medium">{data.name || meta.label}</span>
                </div>

                {/* Funnel bar */}
                <div
                  className={`${meta.bgColor}/15 border ${meta.borderColor} rounded-lg p-3 transition-all`}
                  style={{ width: getBarWidth(data.impressions) }}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-muted-foreground">Impresiones: </span>
                        <span className="font-semibold">{formatNumber(data.impressions)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Clics: </span>
                        <span className="font-semibold">{formatNumber(data.clicks)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-muted-foreground">Conv: </span>
                        <span className="font-semibold">{data.conversions}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gasto: </span>
                        <span className="font-semibold">${data.spend.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conversion rate between stages */}
                {index < stageKeys.length - 1 && (
                  <div className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground">
                    <ArrowRight className="h-3 w-3 rotate-90" />
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {index === 0
                        ? `${tofuToMofu.toFixed(1)}% pasan al MOFU`
                        : `${mofuToBofu.toFixed(1)}% pasan al BOFU`}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* No data message */}
        {stages.tofu.impressions === 0 && stages.mofu.impressions === 0 && stages.bofu.impressions === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Aun no hay metricas disponibles. Las metricas aparecen despues de que las campañas se activen.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
