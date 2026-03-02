'use client';

import { Badge } from '@/components/ui/badge';
import { ArrowDown, Eye, MousePointerClick, ShoppingCart, DollarSign } from 'lucide-react';

interface StageData {
  campaign_name?: string;
  objective?: string;
  budget_percentage?: number;
  targeting?: {
    age_min?: number;
    age_max?: number;
    geo_locations?: { countries?: string[] };
    interests?: Array<{ name: string }>;
  };
}

interface StageMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
}

interface FunnelVisualProps {
  stages: {
    tofu: StageData;
    mofu: StageData;
    bofu: StageData;
  };
  metrics?: Record<string, StageMetrics>;
}

const STAGE_CONFIG = {
  tofu: {
    label: 'TOFU',
    fullLabel: 'Top of Funnel',
    description: 'Conocimiento',
    icon: Eye,
    gradient: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/30',
    text: 'text-blue-500',
    bg: 'bg-blue-500',
    widthClass: 'w-full',
  },
  mofu: {
    label: 'MOFU',
    fullLabel: 'Middle of Funnel',
    description: 'Consideracion',
    icon: MousePointerClick,
    gradient: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/30',
    text: 'text-amber-500',
    bg: 'bg-amber-500',
    widthClass: 'w-[85%]',
  },
  bofu: {
    label: 'BOFU',
    fullLabel: 'Bottom of Funnel',
    description: 'Conversion',
    icon: ShoppingCart,
    gradient: 'from-green-500/20 to-green-600/10',
    border: 'border-green-500/30',
    text: 'text-green-500',
    bg: 'bg-green-500',
    widthClass: 'w-[70%]',
  },
};

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function FunnelVisual({ stages, metrics }: FunnelVisualProps) {
  const stageKeys = ['tofu', 'mofu', 'bofu'] as const;

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      {stageKeys.map((stageKey, index) => {
        const config = STAGE_CONFIG[stageKey];
        const stage = stages[stageKey];
        const stageMetrics = metrics?.[stageKey];
        const Icon = config.icon;

        return (
          <div key={stageKey} className={`${config.widthClass} flex flex-col items-center`}>
            <div
              className={`w-full rounded-xl border ${config.border} bg-gradient-to-r ${config.gradient} p-4 transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.bg}/10`}>
                    <Icon className={`h-5 w-5 ${config.text}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${config.text} border-current`}>
                        {config.label}
                      </Badge>
                      <span className="text-sm font-medium">
                        {stage.campaign_name || config.fullLabel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {config.description} | {stage.budget_percentage || 0}% del presupuesto
                    </p>
                  </div>
                </div>

                {stageMetrics && (stageMetrics.impressions > 0 || stageMetrics.spend > 0) && (
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <p className="text-muted-foreground">Impresiones</p>
                      <p className="font-semibold">{formatNumber(stageMetrics.impressions)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Clics</p>
                      <p className="font-semibold">{formatNumber(stageMetrics.clicks)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Conversiones</p>
                      <p className="font-semibold">{stageMetrics.conversions}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground flex items-center gap-0.5"><DollarSign className="h-3 w-3" />Gasto</p>
                      <p className="font-semibold">${stageMetrics.spend.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Arrow between stages */}
            {index < stageKeys.length - 1 && (
              <div className="flex flex-col items-center py-1">
                <ArrowDown className="h-5 w-5 text-muted-foreground/50" />
                {metrics && (
                  <span className="text-[10px] text-muted-foreground">
                    {(() => {
                      const currentMetrics = metrics[stageKeys[index]];
                      const nextMetrics = metrics[stageKeys[index + 1]];
                      if (!currentMetrics || !nextMetrics || currentMetrics.clicks === 0) return '';
                      const rate = ((nextMetrics.impressions / currentMetrics.clicks) * 100).toFixed(1);
                      return `${rate}% pasan`;
                    })()}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
