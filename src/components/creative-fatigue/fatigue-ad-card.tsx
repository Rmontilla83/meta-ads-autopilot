'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  TrendingDown,
  RotateCcw,
  Eye,
  MousePointer,
  Loader2,
} from 'lucide-react';
import type { FatigueResult } from '@/lib/creative-fatigue/detector';

interface FatigueAdCardProps {
  ad: FatigueResult;
  onRotate: () => void;
  isRotating?: boolean;
}

export function FatigueAdCard({ ad, onRotate, isRotating = false }: FatigueAdCardProps) {
  const statusConfig = {
    healthy: {
      label: 'Saludable',
      variant: 'secondary' as const,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    warning: {
      label: 'En riesgo',
      variant: 'outline' as const,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
    },
    fatigued: {
      label: 'Fatigado',
      variant: 'destructive' as const,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
  };

  const config = statusConfig[ad.status];

  // Calculate CTR drop severity for progress bar (0-100, where 100 is worst)
  const dropSeverity = Math.min(ad.ctrDropPercentage, 100);

  return (
    <Card className={`${config.borderColor} transition-colors`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {ad.status === 'fatigued' && (
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            )}
            {ad.status === 'warning' && (
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
            )}
            <CardTitle className="text-sm font-medium truncate">
              {ad.adName}
            </CardTitle>
          </div>
          <Badge variant={config.variant} className="shrink-0">
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {ad.campaignName}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* CTR Baseline */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MousePointer className="h-3 w-3" />
              <span>CTR base</span>
            </div>
            <p className="text-sm font-semibold">{ad.ctrBaseline.toFixed(2)}%</p>
          </div>

          {/* CTR Current */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3" />
              <span>CTR actual</span>
            </div>
            <p className={`text-sm font-semibold ${
              ad.ctrDropPercentage > 20 ? 'text-red-500' :
              ad.ctrDropPercentage > 10 ? 'text-yellow-500' :
              'text-foreground'
            }`}>
              {ad.ctrCurrent.toFixed(2)}%
            </p>
          </div>

          {/* Frequency */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="h-3 w-3" />
              <span>Frecuencia</span>
            </div>
            <p className={`text-sm font-semibold ${
              ad.frequency > 3.0 ? 'text-red-500' :
              ad.frequency > 2.0 ? 'text-yellow-500' :
              'text-foreground'
            }`}>
              {ad.frequency.toFixed(2)}
            </p>
          </div>

          {/* Impressions */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="h-3 w-3" />
              <span>Impresiones</span>
            </div>
            <p className="text-sm font-semibold">
              {ad.impressions.toLocaleString()}
            </p>
          </div>
        </div>

        {/* CTR Drop Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Caída de CTR</span>
            <span className={`text-xs font-semibold ${
              ad.ctrDropPercentage > 20 ? 'text-red-500' :
              ad.ctrDropPercentage > 10 ? 'text-yellow-500' :
              'text-green-500'
            }`}>
              -{ad.ctrDropPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={dropSeverity}
            className="h-2"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span>Umbral critico: -20%</span>
            <span>-100%</span>
          </div>
        </div>

        {/* Action Button */}
        {(ad.status === 'fatigued' || ad.status === 'warning') && (
          <Button
            onClick={onRotate}
            disabled={isRotating}
            variant={ad.status === 'fatigued' ? 'destructive' : 'outline'}
            className="w-full"
            size="sm"
          >
            {isRotating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Rotando creativo...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Rotar creativo
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
