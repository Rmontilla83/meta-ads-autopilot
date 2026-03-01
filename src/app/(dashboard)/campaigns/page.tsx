'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Megaphone, Loader2, MoreHorizontal, Pencil,
  Trash2, Link2, Eye, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import type { Campaign } from '@/types';

const STATUS_CONFIG = {
  draft: { label: 'Borrador', variant: 'secondary' as const },
  publishing: { label: 'Publicando', variant: 'default' as const },
  active: { label: 'Activa', variant: 'default' as const },
  paused: { label: 'Pausada', variant: 'outline' as const },
  error: { label: 'Error', variant: 'destructive' as const },
};

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_AWARENESS: 'Reconocimiento',
  OUTCOME_TRAFFIC: 'Tráfico',
  OUTCOME_ENGAGEMENT: 'Interacción',
  OUTCOME_LEADS: 'Clientes potenciales',
  OUTCOME_SALES: 'Ventas',
  OUTCOME_APP_PROMOTION: 'Promoción de app',
};

export default function CampaignsPage() {
  const router = useRouter();
  const { user, metaConnection, planLimits, loading: userLoading } = useUser();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCampaigns = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCampaigns(data);
      }
      setLoading(false);
    };

    fetchCampaigns();
  }, [user]);

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from('campaigns').delete().eq('id', id);
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No Meta connection CTA
  if (!metaConnection?.is_active) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Campañas</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y automatiza tus campañas de Meta Ads.
          </p>
        </div>
        <Card>
          <CardHeader className="text-center py-12">
            <div className="flex justify-center mb-4">
              <Link2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle>Conecta tu cuenta de Meta</CardTitle>
            <CardDescription>
              Para crear y publicar campañas, primero necesitas conectar tu cuenta de Meta Ads.
            </CardDescription>
            <div className="mt-4">
              <Button onClick={() => router.push('/settings/meta-connection')}>
                Conectar Meta
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campañas</h1>
          <p className="text-muted-foreground mt-1">
            {campaigns.length} de {planLimits.campaigns === Infinity ? '∞' : planLimits.campaigns} campañas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/campaigns/bulk-create')}>
            <Copy className="h-4 w-4 mr-2" />
            Creación masiva
          </Button>
          <Button onClick={() => router.push('/campaigns/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva campaña con IA
          </Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardHeader className="text-center py-12">
            <div className="flex justify-center mb-4">
              <Megaphone className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle>No tienes campañas aún</CardTitle>
            <CardDescription>
              Crea tu primera campaña con la ayuda de nuestra IA.
            </CardDescription>
            <div className="mt-4">
              <Button onClick={() => router.push('/campaigns/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear campaña
              </Button>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Presupuesto</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => {
                  const statusConfig = STATUS_CONFIG[campaign.status];
                  const campaignData = campaign.campaign_data as Record<string, unknown> | null;
                  const budget = (campaignData as { campaign?: { daily_budget?: number } })?.campaign?.daily_budget;

                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {campaign.objective ? (OBJECTIVE_LABELS[campaign.objective] || campaign.objective) : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {budget ? `$${budget}/día` : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(campaign.created_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/campaigns/${campaign.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/campaigns/${campaign.id}/edit`)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(campaign.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
