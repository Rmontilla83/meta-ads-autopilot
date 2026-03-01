'use client';

import { useEffect, useState, use } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignHeader } from '@/components/campaigns/detail/campaign-header';
import { CampaignKpis } from '@/components/campaigns/detail/campaign-kpis';
import { TabOverview } from '@/components/campaigns/detail/tab-overview';
import { TabAudience } from '@/components/campaigns/detail/tab-audience';
import { TabPlacements } from '@/components/campaigns/detail/tab-placements';
import { TabDevices } from '@/components/campaigns/detail/tab-devices';
import { AdSetsTable } from '@/components/campaigns/detail/adsets-table';
import { AdsGallery } from '@/components/campaigns/detail/ads-gallery';
import { AiAnalysis } from '@/components/campaigns/detail/ai-analysis';
import { ActivityLog } from '@/components/campaigns/detail/activity-log';
import type { CampaignDetailMetrics } from '@/types';

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<CampaignDetailMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

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
      // ignore
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
      // ignore
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
