'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Filter,
  Loader2,
  Sparkles,
  Rocket,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { FunnelVisual } from '@/components/funnels/funnel-visual';
import { FunnelStageCard } from '@/components/funnels/funnel-stage-card';
import { FunnelPublishModal } from '@/components/funnels/funnel-publish-modal';
import type { FunnelDesignOutput } from '@/lib/gemini/validators';

interface FunnelRecord {
  id: string;
  name: string;
  goal: string;
  status: string;
  daily_budget: number;
  created_at: string;
  funnel_config: FunnelDesignOutput['stages'];
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  draft: { label: 'Borrador', icon: Clock, className: 'bg-zinc-500/10 text-zinc-500' },
  publishing: { label: 'Publicando', icon: Loader2, className: 'bg-amber-500/10 text-amber-500' },
  active: { label: 'Activo', icon: CheckCircle2, className: 'bg-green-500/10 text-green-500' },
  paused: { label: 'Pausado', icon: AlertCircle, className: 'bg-amber-500/10 text-amber-500' },
  error: { label: 'Error', icon: XCircle, className: 'bg-red-500/10 text-red-500' },
};

export default function FunnelBuilderPage() {
  const router = useRouter();
  const [goal, setGoal] = useState('');
  const [dailyBudget, setDailyBudget] = useState(15);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generated funnel state
  const [funnelConfig, setFunnelConfig] = useState<FunnelDesignOutput | null>(null);
  const [funnelId, setFunnelId] = useState<string | null>(null);
  const [funnelName, setFunnelName] = useState('');

  // Publish modal
  const [publishOpen, setPublishOpen] = useState(false);

  // Existing funnels
  const [funnels, setFunnels] = useState<FunnelRecord[]>([]);
  const [loadingFunnels, setLoadingFunnels] = useState(true);

  const loadFunnels = useCallback(async () => {
    try {
      const res = await fetch('/api/funnels');
      const data = await res.json();
      if (data.funnels) {
        setFunnels(data.funnels);
      }
    } catch {
      toast.error('Error al cargar los funnels');
    } finally {
      setLoadingFunnels(false);
    }
  }, []);

  useEffect(() => {
    loadFunnels();
  }, [loadFunnels]);

  const handleGenerate = async () => {
    if (!goal.trim()) {
      setError('Describe el objetivo de tu funnel');
      return;
    }
    if (dailyBudget < 3) {
      setError('El presupuesto mínimo es $3 USD/día');
      return;
    }

    setGenerating(true);
    setError(null);
    setFunnelConfig(null);
    setFunnelId(null);

    try {
      const res = await fetch('/api/funnels/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, daily_budget: dailyBudget }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.upgrade) {
          setError(`${data.error}. Actualiza tu plan para acceder a esta función.`);
        } else {
          setError(data.error || 'Error al generar el funnel');
        }
        return;
      }

      setFunnelConfig(data.config);
      setFunnelId(data.funnel?.id);
      setFunnelName(data.config?.funnel_name || data.funnel?.name || '');
      await loadFunnels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setGenerating(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleStageEdit = (stage: 'tofu' | 'mofu' | 'bofu', newData: any) => {
    if (!funnelConfig) return;
    setFunnelConfig({
      ...funnelConfig,
      stages: {
        ...funnelConfig.stages,
        [stage]: newData,
      },
    });
  };

  const handlePublishComplete = () => {
    loadFunnels();
    setFunnelConfig(null);
    setFunnelId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Filter className="h-6 w-6" />
          Constructor de Funnels
        </h1>
        <p className="text-muted-foreground mt-1">
          Crea funnels de ventas automatizados con 3 etapas: TOFU, MOFU y BOFU
        </p>
      </div>

      {/* Generator Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generar Funnel con IA
          </CardTitle>
          <CardDescription>
            Describe tu objetivo y la IA diseñará un funnel completo de 3 campañas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Objetivo del funnel</label>
            <Textarea
              placeholder="Ej: Vender mi curso online de marketing digital a emprendedores en Mexico. Quiero captar leads y convertirlos en compradores."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Presupuesto diario total</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={3}
                  max={1000}
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(Number(e.target.value))}
                  className="w-24 h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground">USD/día</span>
              </div>
            </div>
            <Slider
              value={[dailyBudget]}
              onValueChange={([v]) => setDailyBudget(v)}
              min={3}
              max={200}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>TOFU: ${(dailyBudget * 0.4).toFixed(2)}/día (40%)</span>
              <span>MOFU: ${(dailyBudget * 0.35).toFixed(2)}/día (35%)</span>
              <span>BOFU: ${(dailyBudget * 0.25).toFixed(2)}/día (25%)</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={generating || !goal.trim()}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando funnel...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generar Funnel
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Funnel Preview */}
      {funnelConfig && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{funnelConfig.funnel_name}</h2>
              <p className="text-sm text-muted-foreground">{funnelConfig.strategy}</p>
            </div>
            <Button onClick={() => setPublishOpen(true)} disabled={!funnelId}>
              <Rocket className="mr-2 h-4 w-4" />
              Publicar Funnel
            </Button>
          </div>

          {/* Visual funnel diagram */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vista del Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <FunnelVisual stages={funnelConfig.stages} />
            </CardContent>
          </Card>

          {/* Editable stage cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Detalle por etapa (editable)</h3>
            {(['tofu', 'mofu', 'bofu'] as const).map((stageKey) => (
              <FunnelStageCard
                key={stageKey}
                stage={stageKey}
                data={funnelConfig.stages[stageKey]}
                onEdit={(data) => handleStageEdit(stageKey, data)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {funnelId && (
        <FunnelPublishModal
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          funnelId={funnelId}
          funnelName={funnelName}
          onComplete={handlePublishComplete}
        />
      )}

      {/* Existing Funnels List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mis Funnels</CardTitle>
          <CardDescription>
            Funnels creados anteriormente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingFunnels ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : funnels.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No tienes funnels creados. Genera tu primer funnel arriba.
            </div>
          ) : (
            <div className="space-y-2">
              {funnels.map((funnel) => {
                const statusConf = STATUS_CONFIG[funnel.status] || STATUS_CONFIG.draft;
                const StatusIcon = statusConf.icon;

                return (
                  <div
                    key={funnel.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (funnel.status === 'active' || funnel.status === 'paused') {
                        router.push(`/campaigns/funnels/${funnel.id}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{funnel.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {funnel.goal}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        ${funnel.daily_budget}/día
                      </span>
                      <Badge variant="outline" className={`text-xs ${statusConf.className}`}>
                        <StatusIcon className={`h-3 w-3 mr-1 ${funnel.status === 'publishing' ? 'animate-spin' : ''}`} />
                        {statusConf.label}
                      </Badge>
                      {(funnel.status === 'active' || funnel.status === 'paused') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/campaigns/funnels/${funnel.id}`);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Ver
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
