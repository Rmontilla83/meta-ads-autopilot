'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface FatigueAlertBannerProps {
  fatiguedCount: number;
  warningCount?: number;
  campaignId?: string;
}

export function FatigueAlertBanner({ fatiguedCount, warningCount = 0, campaignId }: FatigueAlertBannerProps) {
  if (fatiguedCount === 0 && warningCount === 0) return null;

  const hasFatigued = fatiguedCount > 0;
  const totalIssues = fatiguedCount + warningCount;

  return (
    <Alert
      variant={hasFatigued ? 'destructive' : 'default'}
      className={hasFatigued
        ? 'border-red-500/50 bg-red-500/10'
        : 'border-yellow-500/50 bg-yellow-500/10'
      }
    >
      <AlertTriangle className={`h-4 w-4 ${hasFatigued ? 'text-red-500' : 'text-yellow-500'}`} />
      <AlertTitle className={hasFatigued ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}>
        {hasFatigued
          ? `${fatiguedCount} anuncio${fatiguedCount > 1 ? 's' : ''} con fatiga creativa`
          : `${warningCount} anuncio${warningCount > 1 ? 's' : ''} en riesgo de fatiga`
        }
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4 mt-1">
        <span className="text-sm text-muted-foreground">
          {hasFatigued
            ? `Se detect${fatiguedCount > 1 ? 'aron' : 'o'} ${totalIssues} anuncio${totalIssues > 1 ? 's' : ''} con frecuencia alta y caída de CTR. Rota los creativos para recuperar rendimiento.`
            : `${warningCount} anuncio${warningCount > 1 ? 's muestran' : ' muestra'} señales tempranas de fatiga. Considera rotar los creativos pronto.`
          }
        </span>
        <Link
          href={campaignId ? `/campaigns/${campaignId}?tab=fatigue` : '/dashboard?tab=fatigue'}
        >
          <Button
            variant={hasFatigued ? 'destructive' : 'outline'}
            size="sm"
            className="whitespace-nowrap"
          >
            {hasFatigued ? 'Rotar creativos' : 'Ver detalles'}
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}
