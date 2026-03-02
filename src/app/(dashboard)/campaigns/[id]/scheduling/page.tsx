'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Clock, Brain, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/hooks/useUser';
import { usePlan } from '@/hooks/usePlan';
import { UpgradeModal } from '@/components/plan/upgrade-modal';
import { PerformanceHeatmap } from '@/components/scheduling/performance-heatmap';
import { ScheduleEditor } from '@/components/scheduling/schedule-editor';
import { ScheduleSummary } from '@/components/scheduling/schedule-summary';
import { createDefaultSchedule } from '@/lib/scheduling/mapper';

interface AIRecommendation {
  schedule_matrix: boolean[][];
  expected_savings_pct: number;
  reasoning: string;
  best_hours: string;
  worst_hours: string;
}

export default function SchedulingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { profile } = useUser();
  const { canUseFeature } = usePlan(profile?.plan);

  const [heatmap, setHeatmap] = useState<number[][] | null>(null);
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null);
  const [schedule, setSchedule] = useState<boolean[][]>(createDefaultSchedule());
  const [currentSpend, setCurrentSpend] = useState<number>(0);

  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');

  const hasAccess = canUseFeature('smartScheduling');

  const handleAnalyze = async () => {
    if (!hasAccess) {
      setShowUpgrade(true);
      return;
    }

    setAnalyzing(true);
    setApplied(false);
    try {
      const res = await fetch('/api/scheduling/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: id }),
      });

      if (res.status === 403) {
        setShowUpgrade(true);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Error al analizar horarios');
        return;
      }

      setHeatmap(data.heatmap);
      setRecommendation(data.recommendation);
      setSchedule(data.recommendation.schedule_matrix);
      setCurrentSpend(data.current_spend_14d || 0);
      toast.success('Analisis completado');
    } catch {
      toast.error('Error al conectar con el servidor');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplySchedule = async () => {
    setApplying(true);
    try {
      const res = await fetch('/api/scheduling/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: id,
          schedule_matrix: schedule,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Error al aplicar horario');
        return;
      }

      if (data.partial) {
        toast.warning(data.message);
      } else {
        toast.success(data.message || 'Horario aplicado exitosamente');
      }
      setApplied(true);
    } catch {
      toast.error('Error al conectar con el servidor');
    } finally {
      setApplying(false);
    }
  };

  const handleUseRecommendation = () => {
    if (recommendation) {
      setSchedule(recommendation.schedule_matrix);
      setActiveTab('editor');
      toast.success('Horario recomendado cargado en el editor');
    }
  };

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/campaigns/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Smart Scheduling</h1>
        </div>
        <UpgradeModal
          open={true}
          onOpenChange={() => router.push(`/campaigns/${id}`)}
          feature="smart_scheduling"
          planRequired="growth"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/campaigns/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Smart Scheduling
            </h1>
            <p className="text-sm text-muted-foreground">
              Optimiza los horarios de publicacion de tu campana con IA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {applied && (
            <Badge variant="default" className="bg-green-600 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Aplicado
            </Badge>
          )}
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                {heatmap ? 'Re-analizar' : 'Analizar horarios'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {!heatmap && !analyzing && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analiza los horarios de tu campana</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              La IA analizara el rendimiento por hora de los ultimos 14 dias y te recomendara
              el horario optimo para maximizar resultados y reducir costos.
            </p>
            <Button onClick={handleAnalyze} disabled={analyzing}>
              <Brain className="h-4 w-4 mr-2" />
              Iniciar analisis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {analyzing && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Obteniendo datos horarios de Meta y analizando con IA...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Esto puede tomar unos segundos
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {heatmap && !analyzing && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="analysis">Analisis</TabsTrigger>
            <TabsTrigger value="editor">Editor de horario</TabsTrigger>
            <TabsTrigger value="summary">Resumen</TabsTrigger>
          </TabsList>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mapa de calor de rendimiento</CardTitle>
                <CardDescription>
                  Rendimiento relativo por hora y dia de la semana (ultimos 14 dias).
                  {currentSpend > 0 && ` Gasto total: $${currentSpend.toFixed(2)} USD.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PerformanceHeatmap heatmap={heatmap} />
              </CardContent>
            </Card>

            {recommendation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-400" />
                    Recomendacion de IA
                  </CardTitle>
                  <CardDescription>
                    Horario optimizado basado en el analisis de rendimiento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Ahorro estimado</p>
                      <p className="text-2xl font-bold text-green-500">
                        {recommendation.expected_savings_pct}%
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-green-400 mb-1">Mejores horarios</p>
                      <p className="text-sm">{recommendation.best_hours}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-red-400 mb-1">Peores horarios</p>
                      <p className="text-sm">{recommendation.worst_hours}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Razonamiento</p>
                    <p className="text-sm leading-relaxed">{recommendation.reasoning}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleUseRecommendation}>
                      Usar horario recomendado
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('editor')}
                    >
                      Personalizar manualmente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Editor Tab */}
          <TabsContent value="editor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Editor de horario</CardTitle>
                <CardDescription>
                  Personaliza las horas activas de tu campana. Los anuncios solo se mostraran en las horas seleccionadas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScheduleEditor schedule={schedule} onChange={setSchedule} />
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              {recommendation && (
                <Button variant="outline" onClick={handleUseRecommendation}>
                  Restaurar recomendacion IA
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('summary')}
                >
                  Ver resumen
                </Button>
                <Button
                  onClick={handleApplySchedule}
                  disabled={applying}
                >
                  {applying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    'Aplicar horario optimo'
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <ScheduleSummary
              schedule={schedule}
              expectedSavings={recommendation?.expected_savings_pct}
              reasoning={recommendation?.reasoning}
              bestHours={recommendation?.best_hours}
              worstHours={recommendation?.worst_hours}
            />

            <div className="flex justify-end">
              <Button
                onClick={handleApplySchedule}
                disabled={applying}
              >
                {applying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  'Aplicar horario optimo'
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="smart_scheduling"
        planRequired="growth"
      />
    </div>
  );
}
