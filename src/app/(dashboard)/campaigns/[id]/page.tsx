'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Loader2, FlaskConical, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';
import { CampaignHeader } from '@/components/campaigns/detail/campaign-header';
import { CampaignKpis } from '@/components/campaigns/detail/campaign-kpis';
import { AdSetsTable } from '@/components/campaigns/detail/adsets-table';
import { AdsGallery } from '@/components/campaigns/detail/ads-gallery';
import { ActivityLog } from '@/components/campaigns/detail/activity-log';
import type { CampaignDetailMetrics } from '@/types';

const TabOverview = dynamic(() => import('@/components/campaigns/detail/tab-overview').then(m => m.TabOverview), {
  loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>,
});
const TabAudience = dynamic(() => import('@/components/campaigns/detail/tab-audience').then(m => m.TabAudience), {
  loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>,
});
const TabPlacements = dynamic(() => import('@/components/campaigns/detail/tab-placements').then(m => m.TabPlacements), {
  loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>,
});
const TabDevices = dynamic(() => import('@/components/campaigns/detail/tab-devices').then(m => m.TabDevices), {
  loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>,
});
const AiAnalysis = dynamic(() => import('@/components/campaigns/detail/ai-analysis').then(m => m.AiAnalysis), {
  loading: () => <div className="h-40 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>,
});

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<CampaignDetailMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [fatiguedCount, setFatiguedCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/analytics/campaign/${id}?dateRange=30d`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Error al cargar');
        }
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado');
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Check creative fatigue
    fetch('/api/creative-fatigue')
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => {
        const fatigued = d.results?.filter((r: { status: string }) => r.status === 'fatigued')?.length ?? 0;
        setFatiguedCount(fatigued);
      })
      .catch(() => { toast.error('Error al verificar fatiga creativa'); });
  }, [id]);

  const handleToggleCampaignStatus = async (active: boolean) => {
    if (!data) return;
    setStatusLoading(true);
    try {
      const res = await fetch('/api/campaigns/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: data.campaign.id,
          entityType: 'campaign',
          status: active ? 'ACTIVE' : 'PAUSED',
        }),
      });
      if (res.ok) {
        const { status } = await res.json();
        setData(prev => prev ? { ...prev, campaign: { ...prev.campaign, status } } : prev);
      }
    } catch {
      toast.error('Error al cambiar el estado de la campaña');
    }
    setStatusLoading(false);
  };

  const handleToggleAdSetStatus = async (adSetId: string, active: boolean) => {
    try {
      const res = await fetch('/api/campaigns/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: adSetId,
          entityType: 'adset',
          status: active ? 'ACTIVE' : 'PAUSED',
        }),
      });
      if (res.ok) {
        const { status } = await res.json();
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            adSets: prev.adSets.map(as =>
              as.id === adSetId ? { ...as, status } : as
            ),
          };
        });
      }
    } catch {
      toast.error('Error al cambiar el estado del ad set');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-600">{error || 'No se pudo cargar la campaña'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <CampaignHeader
        campaign={data.campaign}
        onToggleStatus={handleToggleCampaignStatus}
        statusLoading={statusLoading}
      />

      {/* Feature Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/campaigns/${id}/ab-test`}>
            <FlaskConical className="h-4 w-4 mr-2" />
            A/B Test
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/campaigns/${id}/scheduling`}>
            <Clock className="h-4 w-4 mr-2" />
            Horario
          </Link>
        </Button>
      </div>

      {/* Creative Fatigue Banner */}
      {fatiguedCount > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {fatiguedCount} anuncio{fatiguedCount > 1 ? 's' : ''} con fatiga creativa detectada
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">
                Los anuncios fatigados tienen CTR en declive y frecuencia alta. Considera rotar los creativos.
              </p>
            </div>
            <Button variant="destructive" size="sm" asChild>
              <Link href={`/campaigns/${id}/ab-test`}>Rotar creativos</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <CampaignKpis kpis={data.kpis} />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="audience">Audiencia</TabsTrigger>
          <TabsTrigger value="placements">Ubicaciones</TabsTrigger>
          <TabsTrigger value="devices">Dispositivos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <TabOverview timeSeries={data.timeSeries} />
        </TabsContent>

        <TabsContent value="audience" className="mt-4">
          <TabAudience
            ageBreakdown={data.breakdowns.age}
            genderBreakdown={data.breakdowns.gender}
          />
        </TabsContent>

        <TabsContent value="placements" className="mt-4">
          <TabPlacements data={data.breakdowns.placement} />
        </TabsContent>

        <TabsContent value="devices" className="mt-4">
          <TabDevices data={data.breakdowns.device} />
        </TabsContent>
      </Tabs>

      {/* Ad Sets */}
      <AdSetsTable
        adSets={data.adSets}
        onToggleStatus={handleToggleAdSetStatus}
      />

      {/* Ads Gallery */}
      <AdsGallery ads={data.ads} />

      {/* AI Analysis + Activity Log */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AiAnalysis campaignId={data.campaign.id} />
        </div>
        <div>
          <ActivityLog campaign={data.campaign} />
        </div>
      </div>
    </div>
  );
}
