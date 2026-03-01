'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { CampaignAdSet } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  active: { label: 'Activo', variant: 'default' },
  paused: { label: 'Pausado', variant: 'outline' },
  error: { label: 'Error', variant: 'destructive' },
};

interface AdSetsTableProps {
  adSets: (CampaignAdSet & { metrics?: { impressions: number; clicks: number; spend: number; ctr: number } })[];
  onToggleStatus?: (id: string, active: boolean) => void;
}

export function AdSetsTable({ adSets, onToggleStatus }: AdSetsTableProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggle = async (id: string, active: boolean) => {
    if (!onToggleStatus) return;
    setLoading(id);
    await onToggleStatus(id, active);
    setLoading(null);
  };

  if (adSets.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">No hay conjuntos de anuncios</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Conjuntos de anuncios ({adSets.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple">
          {adSets.map((adSet) => {
            const status = STATUS_CONFIG[adSet.status] || STATUS_CONFIG.draft;
            const canToggle = adSet.status === 'active' || adSet.status === 'paused';
            const targeting = adSet.targeting as {
              age_min?: number; age_max?: number;
              geo_locations?: { countries?: string[] };
            } | null;

            return (
              <AccordionItem key={adSet.id} value={adSet.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <span className="font-medium">{adSet.name}</span>
                    <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                    {adSet.metrics && (
                      <span className="text-xs text-muted-foreground ml-auto mr-4">
                        ${adSet.metrics.spend.toFixed(2)} &middot; {adSet.metrics.clicks} clicks
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Presupuesto</p>
                      <p className="text-sm font-medium">${Number(adSet.budget).toFixed(2)}/día</p>
                    </div>
                    {targeting && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Edad</p>
                          <p className="text-sm">{targeting.age_min || 18} - {targeting.age_max || 65}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Países</p>
                          <p className="text-sm">{targeting.geo_locations?.countries?.join(', ') || '-'}</p>
                        </div>
                      </>
                    )}
                    {canToggle && onToggleStatus && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Estado:</span>
                        <Switch
                          checked={adSet.status === 'active'}
                          onCheckedChange={(checked) => handleToggle(adSet.id, checked)}
                          disabled={loading === adSet.id}
                        />
                      </div>
                    )}
                    {adSet.metrics && (
                      <div className="sm:col-span-2 grid grid-cols-4 gap-2 pt-2 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Impresiones</p>
                          <p className="text-sm font-medium">{adSet.metrics.impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Clicks</p>
                          <p className="text-sm font-medium">{adSet.metrics.clicks.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Inversión</p>
                          <p className="text-sm font-medium">${adSet.metrics.spend.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">CTR</p>
                          <p className="text-sm font-medium">{adSet.metrics.ctr.toFixed(2)}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
