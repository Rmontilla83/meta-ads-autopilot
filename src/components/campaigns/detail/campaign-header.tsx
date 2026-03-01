'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Pencil } from 'lucide-react';
import type { Campaign } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
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

interface CampaignHeaderProps {
  campaign: Campaign;
  onToggleStatus: (active: boolean) => void;
  statusLoading?: boolean;
}

export function CampaignHeader({ campaign, onToggleStatus, statusLoading }: CampaignHeaderProps) {
  const router = useRouter();
  const status = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const canToggle = campaign.status === 'active' || campaign.status === 'paused';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
            {campaign.objective && (
              <Badge variant="outline">
                {OBJECTIVE_LABELS[campaign.objective] || campaign.objective}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Creada {new Date(campaign.created_at).toLocaleDateString('es-MX', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
            {campaign.published_at && (
              <> &middot; Publicada {new Date(campaign.published_at).toLocaleDateString('es-MX', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}</>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {canToggle && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {campaign.status === 'active' ? 'Activa' : 'Pausada'}
            </span>
            <Switch
              checked={campaign.status === 'active'}
              onCheckedChange={onToggleStatus}
              disabled={statusLoading}
            />
          </div>
        )}
        <Button variant="outline" onClick={() => router.push(`/campaigns/${campaign.id}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>
    </div>
  );
}
