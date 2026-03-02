'use client';

import { useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import type { GeneratedCampaign } from '@/lib/gemini/types';
import type { CampaignAuditOutput } from '@/lib/gemini/validators';

interface TabSummaryProps {
  data: GeneratedCampaign;
  businessName?: string;
  industry?: string;
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

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBarColor(score: number): string {
  if (score >= 75) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excelente';
  if (score >= 75) return 'Buena';
  if (score >= 50) return 'Regular';
  return 'Necesita mejoras';
}

const IMPACT_COLORS = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export function TabSummary({ data, businessName, industry }: TabSummaryProps) {
  const validations = getValidation(data);
  const hasErrors = validations.some(v => v.status === 'error');
  const hasWarnings = validations.some(v => v.status === 'warning');

  const [audit, setAudit] = useState<CampaignAuditOutput | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [findingsExpanded, setFindingsExpanded] = useState(true);
  const [recsExpanded, setRecsExpanded] = useState(true);

  const runAudit = useCallback(async () => {
    setAuditing(true);
    setAuditError(null);

    try {
      const response = await fetch('/api/ai/audit-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignData: data,
          businessName,
          industry,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setAuditError(result.error || 'Error al auditar la campaña');
        return;
      }

      setAudit(result);
    } catch {
      setAuditError('Error de conexión al auditar la campaña');
    } finally {
      setAuditing(false);
    }
  }, [data, businessName, industry]);

  // Audit runs only when user clicks the button — no auto-run on mount

  const categoryLabels: Record<string, string> = {
    estructura: 'Estructura',
    presupuesto: 'Presupuesto',
    segmentacion: 'Segmentación',
    creativos: 'Creativos',
    coherencia: 'Coherencia',
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-1">
        <h3 className="text-sm font-semibold">Resumen y verificación</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Antes de publicar, revisa que todo esté correcto. Aquí verás una <strong>lista de verificación automática</strong> que valida tu campaña: nombre, objetivo, presupuesto, audiencia y anuncios. Los items en verde están listos, los amarillos son advertencias opcionales y los rojos deben corregirse antes de publicar. Una vez que todo esté en orden, podrás publicar tu campaña directamente en Meta Ads.
        </p>
      </div>

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

      <Separator />

      {/* AI Audit Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Auditoría IA</h3>
            <p className="text-xs text-muted-foreground">Análisis experto de tu campaña con inteligencia artificial</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runAudit}
            disabled={auditing}
            className="gap-1.5"
          >
            {auditing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {auditing ? 'Auditando...' : audit ? 'Re-auditar' : 'Auditar con IA'}
          </Button>
        </div>

        {auditing && !audit && (
          <Card>
            <CardContent className="p-8 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analizando tu campaña con IA...</p>
              <p className="text-xs text-muted-foreground">Esto puede tomar unos segundos</p>
            </CardContent>
          </Card>
        )}

        {auditError && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-4 w-4" />
                <p className="text-sm">{auditError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {audit && (
          <>
            {/* Overall score */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className={`text-4xl font-bold ${getScoreColor(audit.overall_score)}`}>
                      {audit.overall_score}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">/100</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{getScoreLabel(audit.overall_score)}</p>
                      {auditing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(audit.overall_score)}`}
                        style={{ width: `${audit.overall_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category scores */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Puntuación por categoría</h4>
                {(Object.entries(audit.category_scores) as [string, { score: number; label: string }][]).map(([key, cat]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{categoryLabels[key] || key}</span>
                      <span className={`text-xs font-medium ${getScoreColor(cat.score)}`}>{cat.score}/100</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getScoreBarColor(cat.score)}`}
                        style={{ width: `${cat.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Findings */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <button
                  type="button"
                  className="flex items-center justify-between w-full"
                  onClick={() => setFindingsExpanded(!findingsExpanded)}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Hallazgos ({audit.findings.length})
                  </h4>
                  {findingsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {findingsExpanded && (
                  <div className="space-y-2">
                    {audit.findings.map((finding, i) => (
                      <div
                        key={i}
                        className={`rounded-md border px-3 py-2 ${
                          finding.type === 'positive'
                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                            : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {finding.type === 'positive' ? (
                            <TrendingUp className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium">{finding.title}</span>
                              <Badge variant="secondary" className={`text-[10px] h-4 px-1.5 ${IMPACT_COLORS[finding.impact]}`}>
                                {finding.impact === 'high' ? 'Alto impacto' : finding.impact === 'medium' ? 'Medio' : 'Bajo'}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{finding.detail}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <button
                  type="button"
                  className="flex items-center justify-between w-full"
                  onClick={() => setRecsExpanded(!recsExpanded)}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Recomendaciones ({audit.recommendations.length})
                  </h4>
                  {recsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {recsExpanded && (
                  <div className="space-y-2">
                    {audit.recommendations.map((rec, i) => (
                      <div key={i} className="rounded-md border px-3 py-2 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Minus className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium">{rec.title}</span>
                          <Badge variant="secondary" className={`text-[10px] h-4 px-1.5 ${PRIORITY_COLORS[rec.priority]}`}>
                            {rec.priority === 'high' ? 'Prioridad alta' : rec.priority === 'medium' ? 'Media' : 'Baja'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                            {rec.category}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground pl-5">{rec.description}</p>
                        <p className="text-[11px] text-primary/80 pl-5">Impacto esperado: {rec.expected_impact}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Executive summary */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumen ejecutivo</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{audit.summary}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
