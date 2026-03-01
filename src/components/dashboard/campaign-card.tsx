'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pause, Play, Pencil, Eye } from 'lucide-react';
import type { Campaign } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  publishing: { label: 'Publicando', variant: 'default' },
  active: { label: 'Activa', variant: 'default' },
  paused: { label: 'Pausada', variant: 'outline' },
  error: { label: 'Error', variant: 'destructive' },
};

interface CampaignCardProps {
  campaign: Campaign;
  metrics?: { spend: number; clicks: number; impressions: number; ctr: number };
  onToggleStatus?: (id: string, newStatus: string) => void;
}

export function CampaignCard({ campaign, metrics, onToggleStatus }: CampaignCardProps) {
  const router = useRouter();
  const status = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft;
  const campaignData = campaign.campaign_data as { campaign?: { daily_budget?: number } } | null;
  const budget = campaignData?.campaign?.daily_budget;

  const canToggle = campaign.status === 'active' || campaign.status === 'paused';
  const isActive = campaign.status === 'active';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium truncate">{campaign.name}</h3>
            {budget && (
              <p className="text-xs text-muted-foreground mt-0.5">${budget}/día</p>
            )}
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        {metrics && (
          <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Inversión</p>
              <p className="font-medium">${metrics.spend.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Clicks</p>
              <p className="font-medium">{metrics.clicks.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Impresiones</p>
              <p className="font-medium">{metrics.impressions.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">CTR</p>
              <p className="font-medium">{metrics.ctr.toFixed(2)}%</p>
            </div>
          </div>
        )}

        <div className="flex gap-1">
          {canToggle && onToggleStatus && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onToggleStatus(campaign.id, isActive ? 'PAUSED' : 'ACTIVE')}
            >
              {isActive ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
              {isActive ? 'Pausar' : 'Activar'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/campaigns/${campaign.id}/edit`)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/campaigns/${campaign.id}`)}
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
