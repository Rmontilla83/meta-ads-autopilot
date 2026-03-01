'use client';

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { GeneratedCampaign } from '@/lib/gemini/types';

interface TabSummaryProps {
  data: GeneratedCampaign;
}

interface ValidationItem {
  label: string;
  status: 'ok' | 'warning' | 'error';
  message?: string;
}

function getValidation(data: GeneratedCampaign): ValidationItem[] {
  const items: ValidationItem[] = [];

  // Campaign name
  items.push({
    label: 'Nombre de campaña',
    status: data.campaign.name ? 'ok' : 'error',
    message: data.campaign.name ? data.campaign.name : 'Requerido',
  });

  // Objective
  items.push({
    label: 'Objetivo',
    status: data.campaign.objective ? 'ok' : 'error',
    message: data.campaign.objective || 'Requerido',
  });

  // Budget
  items.push({
    label: 'Presupuesto diario',
    status: data.campaign.daily_budget >= 5 ? 'ok' : 'warning',
    message: data.campaign.daily_budget >= 5
      ? `$${data.campaign.daily_budget}/día`
      : `$${data.campaign.daily_budget}/día (recomendado mín. $5)`,
  });

  // Ad sets
  items.push({
    label: 'Ad sets',
    status: data.ad_sets.length > 0 ? 'ok' : 'error',
    message: `${data.ad_sets.length} configurados`,
  });

  // Budget distribution
  const totalPct = data.ad_sets.reduce((s, a) => s + a.budget_percentage, 0);
  items.push({
    label: 'Distribución de presupuesto',
    status: totalPct === 100 ? 'ok' : 'warning',
    message: totalPct === 100 ? 'Correcta (100%)' : `Total: ${totalPct}% (debe ser 100%)`,
  });

  // Targeting
  const hasTargeting = data.ad_sets.every(
    (s) => s.targeting.geo_locations.countries?.length || s.targeting.geo_locations.cities?.length
  );
  items.push({
    label: 'Segmentación geográfica',
    status: hasTargeting ? 'ok' : 'error',
    message: hasTargeting ? 'Configurada' : 'Al menos una ubicación requerida',
  });

  // Ads
  items.push({
    label: 'Anuncios',
    status: data.ads.length > 0 ? 'ok' : 'error',
    message: `${data.ads.length} creados`,
  });

  // Ad content
  const adsWithContent = data.ads.filter(a => a.primary_text && a.headline);
  items.push({
    label: 'Contenido de anuncios',
    status: adsWithContent.length === data.ads.length ? 'ok' : 'warning',
    message: `${adsWithContent.length}/${data.ads.length} con textos completos`,
  });

  return items;
}

const StatusIcon = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const statusColors = {
  ok: 'text-green-600',
  warning: 'text-yellow-600',
  error: 'text-red-600',
};

export function TabSummary({ data }: TabSummaryProps) {
  const validations = getValidation(data);
  const hasErrors = validations.some(v => v.status === 'error');
  const hasWarnings = validations.some(v => v.status === 'warning');

  return (
    <div className="space-y-6">
      {/* Overall status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {hasErrors ? (
              <>
                <XCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-medium">Campaña incompleta</p>
                  <p className="text-sm text-muted-foreground">Corrige los errores antes de publicar</p>
                </div>
              </>
            ) : hasWarnings ? (
              <>
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                <div>
                  <p className="font-medium">Campaña lista con advertencias</p>
                  <p className="text-sm text-muted-foreground">Puedes publicar, pero revisa las advertencias</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium">Campaña lista para publicar</p>
                  <p className="text-sm text-muted-foreground">Todos los campos requeridos están completos</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation checklist */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Lista de verificación</h3>
        {validations.map((item, i) => {
          const Icon = StatusIcon[item.status];
          return (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${statusColors[item.status]}`} />
                <span className="text-sm">{item.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{item.message}</span>
            </div>
          );
        })}
      </div>

      {/* Campaign overview */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Resumen</h3>
        <Card>
          <CardContent className="p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nombre</span>
              <span className="font-medium">{data.campaign.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Objetivo</span>
              <span className="font-medium">{data.campaign.objective}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Presupuesto diario</span>
              <span className="font-medium">${data.campaign.daily_budget}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ad Sets</span>
              <span className="font-medium">{data.ad_sets.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Anuncios</span>
              <span className="font-medium">{data.ads.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Presupuesto mensual est.</span>
              <span className="font-medium">${(data.campaign.daily_budget * 30).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
