'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Filter,
  Loader2,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { FunnelVisual } from '@/components/funnels/funnel-visual';
import { FunnelMetricsPanel } from '@/components/funnels/funnel-metrics-panel';
import type { FunnelDesignOutput } from '@/lib/gemini/validators';

interface StageMetrics {
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
}

interface CampaignRecord {
  id: string;
  name: string;
  status: string;
  meta_campaign_id: string | null;
  objective: string | null;
}

interface FunnelDetail {
  id: string;
  name: string;
  goal: string;
  status: string;
  daily_budget: number;
  tofu_campaign_id: string | null;
  mofu_campaign_id: string | null;
  bofu_campaign_id: string | null;
  funnel_config: FunnelDesignOutput['stages'];
  custom_audience_ids: string[];
  published_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  draft: { label: 'Borrador', icon: Clock, className: 'text-zinc-500 border-zinc-500/30' },
  publishing: { label: 'Publicando', icon: Loader2, className: 'text-amber-500 border-amber-500/30' },
  active: { label: 'Activo', icon: CheckCircle2, className: 'text-green-500 border-green-500/30' },
  paused: { label: 'Pausado', icon: AlertCircle, className: 'text-amber-500 border-amber-500/30' },
  error: { label: 'Error', icon: XCircle, className: 'text-red-500 border-red-500/30' },
};

export default function FunnelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const funnelId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [funnel, setFunnel] = useState<FunnelDetail | null>(null);
  const [stageMetrics, setStageMetrics] = useState<Record<string, StageMetrics>>({
    tofu: { impressions: 0, reach: 0, clicks: 0, conversions: 0, spend: 0, ctr: 0, cpc: 0, cpm: 0 },
    mofu: { impressions: 0, reach: 0, clicks: 0, conversions: 0, spend: 0, ctr: 0, cpc: 0, cpm: 0 },
    bofu: { impressions: 0, reach: 0, clicks: 0, conversions: 0, spend: 0, ctr: 0, cpc: 0, cpm: 0 },
  });
  const [conversionRates, setConversionRates] = useState({
    tofu_to_mofu: 0,
    mofu_to_bofu: 0,
    overall: 0,
  });
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);

  const loadFunnel = useCallback(async () => {
    try {
      const res = await fetch(`/api/funnels/${funnelId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al cargar el funnel');
        return;
      }

      setFunnel(data.funnel);
      setStageMetrics(data.stageMetrics);
      setConversionRates(data.conversionRates);
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexion');
    } finally {
      setLoading(false);
    }
  }, [funnelId]);

  useEffect(() => {
    loadFunnel();
  }, [loadFunnel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error || 'Funnel no encontrado'}</p>
        <Button variant="outline" onClick={() => router.push('/campaigns/funnel-builder')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    );
  }

  const statusConf = STATUS_CONFIG[funnel.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConf.icon;

  const totalSpend = stageMetrics.tofu.spend + stageMetrics.mofu.spend + stageMetrics.bofu.spend;

  // Build stage data for visual with names from config
  const visualStages = {
    tofu: {
      ...funnel.funnel_config.tofu,
      campaign_name: funnel.funnel_config.tofu?.campaign_name || 'TOFU',
    },
    mofu: {
      ...funnel.funnel_config.mofu,
      campaign_name: funnel.funnel_config.mofu?.campaign_name || 'MOFU',
    },
    bofu: {
      ...funnel.funnel_config.bofu,
      campaign_name: funnel.funnel_config.bofu?.campaign_name || 'BOFU',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns/funnel-builder')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <h1 className="text-xl font-bold">{funnel.name}</h1>
              <Badge variant="outline" className={statusConf.className}>
                <StatusIcon className={`h-3 w-3 mr-1 ${funnel.status === 'publishing' ? 'animate-spin' : ''}`} />
                {statusConf.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{funnel.goal}</p>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Presupuesto/dia</p>
              <p className="text-lg font-bold">${funnel.daily_budget}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Gasto total</p>
              <p className="text-lg font-bold">${totalSpend.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <TrendingUp className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">TOFU a MOFU</p>
              <p className="text-lg font-bold">{conversionRates.tofu_to_mofu.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <TrendingUp className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">MOFU a BOFU</p>
              <p className="text-lg font-bold">{conversionRates.mofu_to_bofu.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visual with metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vista del Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelVisual
            stages={visualStages}
            metrics={stageMetrics}
          />
        </CardContent>
      </Card>

      {/* Metrics Panel */}
      <FunnelMetricsPanel
        stages={{
          tofu: {
            ...stageMetrics.tofu,
            name: funnel.funnel_config.tofu?.campaign_name || 'TOFU',
          },
          mofu: {
            ...stageMetrics.mofu,
            name: funnel.funnel_config.mofu?.campaign_name || 'MOFU',
          },
          bofu: {
            ...stageMetrics.bofu,
            name: funnel.funnel_config.bofu?.campaign_name || 'BOFU',
          },
        }}
      />

      {/* Campaign Links */}
      {campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campañas del Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {campaigns.map((campaign) => {
                const isTofu = campaign.id === funnel.tofu_campaign_id;
                const isMofu = campaign.id === funnel.mofu_campaign_id;
                const isBofu = campaign.id === funnel.bofu_campaign_id;
                const stageLabel = isTofu ? 'TOFU' : isMofu ? 'MOFU' : isBofu ? 'BOFU' : '';
                const stageColor = isTofu
                  ? 'text-blue-500 border-blue-500/30'
                  : isMofu
                    ? 'text-amber-500 border-amber-500/30'
                    : 'text-green-500 border-green-500/30';

                return (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`text-xs ${stageColor}`}>
                        {stageLabel}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {campaign.objective} | {campaign.status}
                        </p>
                      </div>
                    </div>
                    <Link href={`/campaigns/${campaign.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs h-7">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Ver detalle
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Published info */}
      {funnel.published_at && (
        <p className="text-xs text-muted-foreground text-center">
          Publicado el {new Date(funnel.published_at).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
    </div>
  );
}
