'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Loader2, Search, Users, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { OpportunityCard } from '@/components/retargeting/opportunity-card';
import { RetargetingPreview } from '@/components/retargeting/retargeting-preview';
import type { Campaign, CustomAudience } from '@/types';

interface RetargetingOpportunity {
  name: string;
  audience_type: string;
  retention_days: number;
  estimated_size: string;
  copy: {
    primary_text: string;
    headline: string;
    description: string;
  };
  offer_suggestion: string;
  rationale: string;
}

export default function RetargetingPage() {
  const { user, metaConnection, planLimits, loading: userLoading } = useUser();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [audiences, setAudiences] = useState<CustomAudience[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [opportunities, setOpportunities] = useState<RetargetingOpportunity[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<RetargetingOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const supabase = createClient();

      const [campaignsRes, audiencesRes] = await Promise.all([
        supabase
          .from('campaigns')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'paused', 'draft'])
          .order('created_at', { ascending: false }),
        fetch('/api/retargeting/audiences').then((r) => r.json()),
      ]);

      setCampaigns(campaignsRes.data || []);
      setAudiences(audiencesRes.audiences || []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleDetectOpportunities = async () => {
    if (!selectedCampaignId) {
      toast.error('Selecciona una campaña');
      return;
    }

    setDetecting(true);
    setOpportunities([]);
    setSelectedOpportunity(null);

    try {
      const res = await fetch('/api/retargeting/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: selectedCampaignId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al detectar oportunidades');
      }

      setOpportunities(data.opportunities || []);
      toast.success(`Se encontraron ${data.opportunities?.length || 0} oportunidades`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al detectar oportunidades');
    } finally {
      setDetecting(false);
    }
  };

  const handleCreateCampaign = async (opportunity: RetargetingOpportunity) => {
    if (!metaConnection?.ad_account_id) {
      toast.error('No hay cuenta publicitaria configurada');
      return;
    }

    setCreatingId(opportunity.name);

    try {
      const res = await fetch('/api/retargeting/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          opportunity,
          ad_account_id: metaConnection.ad_account_id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear la campaña');
      }

      toast.success('Campaña de retargeting creada como borrador');

      // Refresh audiences
      const audiencesRes = await fetch('/api/retargeting/audiences').then((r) => r.json());
      setAudiences(audiencesRes.audiences || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear la campaña');
    } finally {
      setCreatingId(null);
    }
  };

  const handleCreateLookalike = async (audienceId: string) => {
    if (!metaConnection?.ad_account_id) {
      toast.error('No hay cuenta publicitaria configurada');
      return;
    }

    try {
      const res = await fetch('/api/audiences/lookalike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ad_account_id: metaConnection.ad_account_id,
          source_audience_id: audienceId,
          country: 'MX',
          ratios: [0.01, 0.03],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear lookalike');
      }

      toast.success('Audiencias lookalike creadas');

      // Refresh audiences
      const audiencesRes = await fetch('/api/retargeting/audiences').then((r) => r.json());
      setAudiences(audiencesRes.audiences || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear lookalike');
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!planLimits.retargeting) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Retargeting</h2>
        <p className="text-muted-foreground mb-4">
          El retargeting está disponible en el plan Growth o superior. Mejora tu plan para acceder a esta funcionalidad.
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
        <h1 className="text-3xl font-bold tracking-tight">Retargeting</h1>
        <p className="text-muted-foreground">
          Detecta oportunidades de retargeting y crea campañas para reconquistar a tu audiencia.
        </p>
      </div>

      {/* Campaign selector + detect button */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detectar oportunidades</CardTitle>
          <CardDescription>
            Selecciona una campaña existente para analizar y encontrar oportunidades de retargeting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecciona una campaña" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleDetectOpportunities}
              disabled={!selectedCampaignId || detecting}
            >
              {detecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Detectar oportunidades
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">
              {opportunities.length} oportunidades encontradas
            </h2>
            {opportunities.map((opp, index) => (
              <OpportunityCard
                key={index}
                opportunity={opp}
                onCreateCampaign={(o) => {
                  setSelectedOpportunity(o);
                  handleCreateCampaign(o);
                }}
                creating={creatingId === opp.name}
              />
            ))}
          </div>
          <div>
            {selectedOpportunity && (
              <div className="sticky top-20">
                <RetargetingPreview opportunity={selectedOpportunity} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Existing audiences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Audiencias existentes
          </CardTitle>
          <CardDescription>
            Audiencias personalizadas y lookalike creadas para tus campañas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {audiences.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay audiencias creadas. Detecta oportunidades y crea tu primera audiencia de retargeting.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Campaña</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audiences.map((audience) => (
                    <TableRow key={audience.id}>
                      <TableCell className="font-medium">{audience.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {audience.audience_type === 'retargeting'
                            ? 'Retargeting'
                            : audience.audience_type === 'lookalike'
                            ? 'Lookalike'
                            : 'Custom'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            audience.status === 'ready'
                              ? 'default'
                              : audience.status === 'error'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {audience.status === 'ready'
                            ? 'Lista'
                            : audience.status === 'error'
                            ? 'Error'
                            : audience.status === 'pending'
                            ? 'Pendiente'
                            : audience.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(audience as unknown as { campaigns?: { name: string } })?.campaigns?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {audience.audience_type === 'retargeting' && audience.status === 'ready' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateLookalike(audience.id)}
                            title="Crear audiencia lookalike"
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Lookalike
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
