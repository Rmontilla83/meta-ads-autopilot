'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Megaphone, Loader2, MoreHorizontal, Pencil,
  Trash2, Link2, Eye, Copy, Pause, Play, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Campaign } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; variant: 'secondary' | 'default' | 'outline' | 'destructive' }> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  publishing: { label: 'Publicando', variant: 'default' },
  active: { label: 'Activa', variant: 'default' },
  paused: { label: 'Pausada', variant: 'outline' },
  error: { label: 'Error', variant: 'destructive' },
};

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_AWARENESS: 'Reconocimiento',
  OUTCOME_TRAFFIC: 'Tráfico',
  OUTCOME_ENGAGEMENT: 'Interacción',
  OUTCOME_LEADS: 'Clientes potenciales',
  OUTCOME_SALES: 'Ventas',
  OUTCOME_APP_PROMOTION: 'Promoción de app',
};

const PAGE_SIZE = 20;

export default function CampaignsPage() {
  const router = useRouter();
  const { user, metaConnection, planLimits, loading: userLoading } = useUser();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchCampaigns = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Error al cargar las campañas');
      } else if (data) {
        setCampaigns(data);
      }
      setLoading(false);
    };

    fetchCampaigns();
  }, [user]);

  const filteredCampaigns = useMemo(() => {
    let result = campaigns;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }

    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    return result;
  }, [campaigns, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredCampaigns.length / PAGE_SIZE);
  const paginatedCampaigns = filteredCampaigns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [searchQuery, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.meta_campaign_id) {
        toast.error('No se puede eliminar una campaña publicada en Meta. Primero paúsala desde Meta Ads Manager.');
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.from('campaigns').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setCampaigns(prev => prev.filter(c => c.id !== deleteTarget.id));
      toast.success('Campaña eliminada');
    } catch {
      toast.error('Error al eliminar la campaña');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    const metaStatus = newStatus === 'active' ? 'ACTIVE' : 'PAUSED';

    try {
      if (campaign.meta_campaign_id) {
        const response = await fetch('/api/campaigns/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityId: campaign.id,
            entityType: 'campaign',
            status: metaStatus,
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          toast.error(result.error || 'Error al cambiar estado');
          return;
        }
      } else {
        const supabase = createClient();
        await supabase
          .from('campaigns')
          .update({ status: newStatus })
          .eq('id', campaign.id);
      }

      setCampaigns(prev =>
        prev.map(c => c.id === campaign.id ? { ...c, status: newStatus } : c)
      );
      toast.success(newStatus === 'active' ? 'Campaña activada' : 'Campaña pausada');
    } catch {
      toast.error('Error al cambiar el estado de la campaña');
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
              <Button onClick={() => window.location.href = '/api/auth/meta/connect'}>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Campañas</h1>
          <p className="text-muted-foreground mt-1">
            {campaigns.length} de {planLimits.activeCampaigns === -1 ? '∞' : planLimits.activeCampaigns} campañas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/campaigns/bulk-create')}>
            <Copy className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Creación masiva</span>
            <span className="sm:hidden">Masiva</span>
          </Button>
          <Button size="sm" onClick={() => router.push('/campaigns/new')}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nueva campaña con IA</span>
            <span className="sm:hidden">Nueva</span>
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
        <>
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="paused">Pausadas</SelectItem>
                <SelectItem value="draft">Borradores</SelectItem>
                <SelectItem value="error">Con error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block">
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
                  {paginatedCampaigns.map((campaign) => {
                    const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
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
                          <CampaignActions
                            campaign={campaign}
                            onEdit={() => router.push(`/campaigns/${campaign.id}/edit`)}
                            onView={() => router.push(`/campaigns/${campaign.id}`)}
                            onToggle={() => handleToggleStatus(campaign)}
                            onDelete={() => setDeleteTarget(campaign)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile Cards */}
          <div className="grid gap-3 md:hidden">
            {paginatedCampaigns.map((campaign) => {
              const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
              const campaignData = campaign.campaign_data as Record<string, unknown> | null;
              const budget = (campaignData as { campaign?: { daily_budget?: number } })?.campaign?.daily_budget;

              return (
                <Card key={campaign.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{campaign.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={statusConfig.variant} className="text-xs">
                            {statusConfig.label}
                          </Badge>
                          {campaign.objective && (
                            <span className="text-xs text-muted-foreground">
                              {OBJECTIVE_LABELS[campaign.objective] || campaign.objective}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {budget && <span>${budget}/día</span>}
                          <span>
                            {new Date(campaign.created_at).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      </div>
                      <CampaignActions
                        campaign={campaign}
                        onEdit={() => router.push(`/campaigns/${campaign.id}/edit`)}
                        onView={() => router.push(`/campaigns/${campaign.id}`)}
                        onToggle={() => handleToggleStatus(campaign)}
                        onDelete={() => setDeleteTarget(campaign)}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredCampaigns.length} campaña(s) encontrada(s)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar campaña?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.meta_campaign_id
                ? 'Esta campaña está publicada en Meta. No se puede eliminar directamente. Paúsala primero desde Meta Ads Manager.'
                : `Se eliminará la campaña "${deleteTarget?.name}" de forma permanente. Esta acción no se puede deshacer.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            {!deleteTarget?.meta_campaign_id && (
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Eliminar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CampaignActions({
  campaign,
  onEdit,
  onView,
  onToggle,
  onDelete,
}: {
  campaign: Campaign;
  onEdit: () => void;
  onView: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <Eye className="h-4 w-4 mr-2" />
          Ver detalles
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </DropdownMenuItem>
        {(campaign.status === 'active' || campaign.status === 'paused') && (
          <DropdownMenuItem onClick={onToggle}>
            {campaign.status === 'active' ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pausar
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Activar
              </>
            )}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
