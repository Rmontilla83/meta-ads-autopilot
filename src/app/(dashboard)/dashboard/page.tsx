'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link2, Plus, Loader2, DollarSign, Users, MousePointer, Target, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { CampaignCard } from '@/components/dashboard/campaign-card';
import type { Campaign, DashboardKPIs, DailyMetric } from '@/types';
import { CampaignExpressCard } from '@/components/campaigns/express/campaign-express-card';

const MetricsChart = dynamic(() => import('@/components/dashboard/metrics-chart').then(m => m.MetricsChart), {
  loading: () => <div className="h-80 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>,
});
const AiInsights = dynamic(() => import('@/components/dashboard/ai-insights').then(m => m.AiInsights), {
  loading: () => <div className="h-40 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>,
});

export default function DashboardPage() {
  const router = useRouter();
  const { profile, metaConnection, loading: userLoading } = useUser();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [timeSeries, setTimeSeries] = useState<DailyMetric[]>([]);
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async (range: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/dashboard?dateRange=${range}`);
      if (res.ok) {
        const data = await res.json();
        setKpis(data.kpis);
        setTimeSeries(data.timeSeries);
      }
    } catch {
      toast.error('Error al cargar las métricas del dashboard');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (userLoading) return;

    const loadCampaigns = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .in('status', ['active', 'paused', 'publishing'])
        .order('updated_at', { ascending: false })
        .limit(10);
      if (data) setCampaigns(data);
    };

    if (metaConnection?.is_active) {
      loadCampaigns();
      fetchData(dateRange);
    } else {
      setLoading(false);
    }
  }, [userLoading, metaConnection, dateRange, fetchData]);

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    fetchData(range);
  };

  const handleSyncMetrics = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/analytics/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Error al sincronizar');
      } else {
        toast.success(`Sincronización completa: ${data.synced} registros de ${data.campaigns} campaña(s)`);
        // Reload dashboard data
        fetchData(dateRange);
        // Reload campaigns list
        const supabase = createClient();
        const { data: freshCampaigns } = await supabase
          .from('campaigns')
          .select('*')
          .in('status', ['active', 'paused', 'publishing'])
          .order('updated_at', { ascending: false })
          .limit(10);
        if (freshCampaigns) setCampaigns(freshCampaigns);
      }
    } catch {
      toast.error('Error de conexión al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = async (campaignId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/campaigns/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: campaignId, entityType: 'campaign', status: newStatus }),
      });
      if (res.ok) {
        const { status } = await res.json();
        setCampaigns(prev => prev.map(c =>
          c.id === campaignId ? { ...c, status } : c
        ));
      }
    } catch {
      toast.error('Error al cambiar el estado de la campaña');
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No Meta connection
  if (!metaConnection?.is_active) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            ¡Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Conecta tu cuenta de Meta para comenzar.
          </p>
        </div>
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Conecta tu cuenta de Meta para crear campañas</CardTitle>
                <CardDescription className="mt-1">
                  Vincula tu cuenta de Meta Business para ver métricas, gestionar campañas y recibir sugerencias de IA.
                </CardDescription>
              </div>
              <Button onClick={() => window.location.href = '/api/auth/meta/connect'} className="shrink-0">
                <Link2 className="mr-2 h-4 w-4" />
                Conectar Meta
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // No campaigns
  if (!loading && campaigns.length === 0 && !kpis) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            ¡Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Crea tu primera campaña para ver métricas aquí.
          </p>
        </div>
        <Card>
          <CardHeader className="text-center py-12">
            <CardTitle>Crea tu primera campaña con IA</CardTitle>
            <CardDescription>
              Nuestro asistente de IA te ayudará a crear una campaña optimizada en minutos.
            </CardDescription>
            <div className="mt-4">
              <Button onClick={() => router.push('/campaigns/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva campaña con IA
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Full dashboard
  const activeCampaignIds = campaigns
    .filter(c => c.status === 'active' && c.meta_campaign_id)
    .map(c => c.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            ¡Hola, {profile?.full_name?.split(' ')[0] || 'Usuario'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Aquí tienes un resumen de tus campañas de Meta Ads.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncMetrics}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {syncing ? 'Sincronizando...' : 'Sincronizar métricas'}
        </Button>
      </div>

      {/* Campaign Express */}
      <CampaignExpressCard />

      {/* KPI Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <div className="p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-3" />
                <div className="h-8 bg-muted rounded w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : kpis && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Inversión"
            value={`$${kpis.spend.toFixed(2)}`}
            change={kpis.spendChange}
            icon={DollarSign}
            sparklineData={timeSeries.map(d => d.spend)}
          />
          <KpiCard
            title="Alcance"
            value={kpis.reach.toLocaleString()}
            change={kpis.reachChange}
            icon={Users}
            sparklineData={timeSeries.map(d => d.reach)}
          />
          <KpiCard
            title="Clicks"
            value={kpis.clicks.toLocaleString()}
            change={kpis.clicksChange}
            icon={MousePointer}
            sparklineData={timeSeries.map(d => d.clicks)}
          />
          <KpiCard
            title="Conversiones"
            value={kpis.conversions.toLocaleString()}
            change={kpis.conversionsChange}
            icon={Target}
            sparklineData={timeSeries.map(d => d.conversions)}
          />
        </div>
      )}

      {/* Metrics Chart */}
      {!loading && timeSeries.length > 0 && (
        <MetricsChart
          data={timeSeries}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
        />
      )}

      {/* Two columns: Campaigns + AI Insights */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Campañas activas</h2>
            <Button variant="outline" size="sm" onClick={() => router.push('/campaigns')}>
              Ver todas
            </Button>
          </div>
          {campaigns.length === 0 ? (
            <Card>
              <CardHeader className="text-center py-8">
                <CardDescription>No hay campañas activas</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {campaigns.slice(0, 6).map(campaign => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onToggleStatus={(id, status) => handleToggleStatus(id, status)}
                />
              ))}
            </div>
          )}
        </div>
        <div>
          <AiInsights campaignIds={activeCampaignIds} />
        </div>
      </div>
    </div>
  );
}
