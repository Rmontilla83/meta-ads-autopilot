'use client';

import { TrendingUp, AlertTriangle, CheckCircle, Loader2, ArrowUpRight, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ScalingRecommendation {
  should_scale: boolean;
  scaling_type: string;
  amount_percentage: number;
  risk_level: string;
  reasoning: string;
  current_metrics: {
    daily_spend: number;
    cpa: number;
    ctr: number;
    roas: number;
    conversions_per_day: number;
  };
  projected_metrics: {
    daily_spend: number;
    cpa: number;
    ctr: number;
    roas: number;
    conversions_per_day: number;
  };
  conditions_to_revert: string;
}

interface ScalingOpportunityCardProps {
  campaignName: string;
  campaignId: string;
  recommendation: ScalingRecommendation;
  guardBlocked: boolean;
  guardReason?: string;
  onExecute: (scalingType: string, amountPercentage: number) => void;
  executing: boolean;
}

const SCALING_TYPE_LABELS: Record<string, string> = {
  vertical: 'Aumento de presupuesto',
  horizontal: 'Duplicar ad set',
  lookalike: 'Expandir con lookalike',
};

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const RISK_LABELS: Record<string, string> = {
  low: 'Riesgo bajo',
  medium: 'Riesgo medio',
  high: 'Riesgo alto',
};

export function ScalingOpportunityCard({
  campaignName,
  recommendation,
  guardBlocked,
  guardReason,
  onExecute,
  executing,
}: ScalingOpportunityCardProps) {
  const canExecute = recommendation.should_scale && !guardBlocked;

  return (
    <Card className={!recommendation.should_scale ? 'border-yellow-200 dark:border-yellow-800' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{campaignName}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {SCALING_TYPE_LABELS[recommendation.scaling_type] || recommendation.scaling_type}
              {recommendation.should_scale && ` (+${recommendation.amount_percentage}%)`}
            </p>
          </div>
          <div className="flex gap-2">
            {recommendation.should_scale ? (
              <Badge className={RISK_COLORS[recommendation.risk_level] || ''}>
                {RISK_LABELS[recommendation.risk_level] || recommendation.risk_level}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                No escalar
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reasoning */}
        <p className="text-sm text-muted-foreground">{recommendation.reasoning}</p>

        {/* Metrics comparison */}
        {recommendation.should_scale && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Actual</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Gasto/dia</span>
                  <span className="font-medium">${recommendation.current_metrics.daily_spend.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CPA</span>
                  <span className="font-medium">${recommendation.current_metrics.cpa.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CTR</span>
                  <span className="font-medium">{recommendation.current_metrics.ctr.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Conv/dia</span>
                  <span className="font-medium">{recommendation.current_metrics.conversions_per_day.toFixed(1)}</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                Proyectado
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Gasto/dia</span>
                  <span className="font-medium">${recommendation.projected_metrics.daily_spend.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CPA</span>
                  <span className="font-medium">${recommendation.projected_metrics.cpa.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CTR</span>
                  <span className="font-medium">{recommendation.projected_metrics.ctr.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Conv/dia</span>
                  <span className="font-medium">{recommendation.projected_metrics.conversions_per_day.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Revert conditions */}
        {recommendation.conditions_to_revert && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 p-3">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Condiciones para revertir</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">{recommendation.conditions_to_revert}</p>
            </div>
          </div>
        )}

        {/* Guard blocked message */}
        {guardBlocked && guardReason && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{guardReason}</p>
          </div>
        )}

        {/* Execute button */}
        <Button
          className="w-full"
          onClick={() => onExecute(recommendation.scaling_type, recommendation.amount_percentage)}
          disabled={!canExecute || executing}
          variant={canExecute ? 'default' : 'outline'}
        >
          {executing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Ejecutando...
            </>
          ) : canExecute ? (
            <>
              <TrendingUp className="h-4 w-4 mr-2" />
              Ejecutar escalado
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              {recommendation.should_scale ? 'Bloqueado por guardias' : 'No recomendado'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
