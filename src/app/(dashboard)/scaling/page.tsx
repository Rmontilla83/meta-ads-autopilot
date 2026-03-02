'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Loader2, Search, History, AlertTriangle, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ScalingOpportunityCard } from '@/components/scaling/scaling-opportunity-card';
import { ScalingHistoryTable } from '@/components/scaling/scaling-history-table';
import type { Campaign, ScalingEvent } from '@/types';

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

interface EvaluationResult {
  campaignId: string;
  campaignName: string;
  recommendation: ScalingRecommendation;
  guardBlocked: boolean;
  guardReason?: string;
}

export default function ScalingPage() {
  const { user, planLimits, loading: userLoading } = useUser();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<ScalingEvent[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const supabase = createClient();

      const [campaignsRes, historyRes] = await Promise.all([
        supabase
          .from('campaigns')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active'])
          .order('created_at', { ascending: false }),
        fetch('/api/scaling/history').then((r) => r.json()),
      ]);

      setCampaigns(campaignsRes.data || []);
      setEvents(historyRes.events || []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleEvaluate = async (campaignId: string) => {
    setEvaluatingId(campaignId);

    try {
      const res = await fetch('/api/scaling/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al evaluar escalado');
      }

      const campaign = campaigns.find((c) => c.id === campaignId);
      const evaluation: EvaluationResult = {
        campaignId,
        campaignName: campaign?.name || 'Campaña',
        recommendation: data.recommendation,
        guardBlocked: !data.guard_status.allowed,
        guardReason: data.guard_status.reason,
      };

      setEvaluations((prev) => {
        const filtered = prev.filter((e) => e.campaignId !== campaignId);
        return [evaluation, ...filtered];
      });

      if (data.recommendation.should_scale) {
        toast.success('Se recomienda escalar esta campaña');
      } else {
        toast.info('No se recomienda escalar en este momento');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al evaluar');
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleExecute = async (campaignId: string, scalingType: string, amountPercentage: number) => {
    setExecutingId(campaignId);

    try {
      const res = await fetch('/api/scaling/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          scaling_type: scalingType,
          amount_percentage: amountPercentage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al ejecutar escalado');
      }

      toast.success('Escalado ejecutado correctamente');

      // Refresh history
      const historyRes = await fetch('/api/scaling/history').then((r) => r.json());
      setEvents(historyRes.events || []);

      // Remove evaluation
      setEvaluations((prev) => prev.filter((e) => e.campaignId !== campaignId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al ejecutar');
    } finally {
      setExecutingId(null);
    }
  };

  // Calculate daily limit usage
  const todayEvents = events.filter((e) => {
    const eventDate = new Date(e.created_at);
    const today = new Date();
    return (
      eventDate.toDateString() === today.toDateString() &&
      e.scaling_type === 'vertical' &&
      e.success &&
      !e.reverted
    );
  });

  const dailyUsedPct = todayEvents.reduce((sum, e) => {
    const detail = e.action_detail as { amount_percentage?: number };
    return sum + (detail.amount_percentage || 0);
  }, 0);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!planLimits.autoOptimizer) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Escalado de campañas</h2>
        <p className="text-muted-foreground mb-4">
          El escalado automático está disponible en el plan Growth o superior.
        </p>
        <Button asChild>
          <a href="/pricing">Ver planes</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Escalado</h1>
        <p className="text-muted-foreground">
          Evalúa y escala tus campañas con recomendaciones de IA y protecciones automáticas.
        </p>
      </div>

      {/* Daily limit indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Límite diario de escalado</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {dailyUsedPct}% / 20% usado hoy
            </span>
          </div>
          <Progress value={(dailyUsedPct / 20) * 100} className="h-2" />
          {dailyUsedPct >= 20 && (
            <div className="flex items-center gap-2 mt-2 text-sm text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Has alcanzado el límite diario de escalado. Intenta mañana.
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">
            <TrendingUp className="h-4 w-4 mr-2" />
            Campañas activas
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {/* Active campaigns list */}
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin campañas activas</h3>
                <p className="text-muted-foreground">
                  Necesitas al menos una campaña activa para evaluar el escalado.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Campañas activas</CardTitle>
                  <CardDescription>
                    Selecciona una campaña para evaluar si es apta para escalar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaña</TableHead>
                          <TableHead>Objetivo</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaigns.map((campaign) => (
                          <TableRow key={campaign.id}>
                            <TableCell className="font-medium">{campaign.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{campaign.objective || '-'}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default">Activa</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEvaluate(campaign.id)}
                                disabled={evaluatingId === campaign.id}
                              >
                                {evaluatingId === campaign.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Evaluando...
                                  </>
                                ) : (
                                  <>
                                    <Search className="h-4 w-4 mr-2" />
                                    Evaluar escalado
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Evaluation results */}
              {evaluations.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Recomendaciones</h2>
                  {evaluations.map((evaluation) => (
                    <ScalingOpportunityCard
                      key={evaluation.campaignId}
                      campaignName={evaluation.campaignName}
                      campaignId={evaluation.campaignId}
                      recommendation={evaluation.recommendation}
                      guardBlocked={evaluation.guardBlocked}
                      guardReason={evaluation.guardReason}
                      onExecute={(scalingType, amountPct) =>
                        handleExecute(evaluation.campaignId, scalingType, amountPct)
                      }
                      executing={executingId === evaluation.campaignId}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de escalado
              </CardTitle>
              <CardDescription>
                Todas las acciones de escalado realizadas en tus campañas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScalingHistoryTable events={events} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
