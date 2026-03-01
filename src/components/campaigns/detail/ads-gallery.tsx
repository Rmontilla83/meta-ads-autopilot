'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CampaignAd } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Borrador', variant: 'secondary' },
  active: { label: 'Activo', variant: 'default' },
  paused: { label: 'Pausado', variant: 'outline' },
  error: { label: 'Error', variant: 'destructive' },
};

interface AdsGalleryProps {
  ads: (CampaignAd & { metrics?: { impressions: number; clicks: number; spend: number; ctr: number } })[];
}

export function AdsGallery({ ads }: AdsGalleryProps) {
  if (ads.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">No hay anuncios</p>
        </CardContent>
      </Card>
    );
  }

  // Find best/worst by CTR
  const adsWithCtr = ads.filter(a => a.metrics && a.metrics.impressions > 100);
  const bestCtr = adsWithCtr.length > 1
    ? Math.max(...adsWithCtr.map(a => a.metrics!.ctr))
    : null;
  const worstCtr = adsWithCtr.length > 1
    ? Math.min(...adsWithCtr.map(a => a.metrics!.ctr))
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Anuncios ({ads.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => {
            const status = STATUS_CONFIG[ad.status] || STATUS_CONFIG.draft;
            const creative = ad.creative_data as {
              headline?: string; primary_text?: string; format?: string;
            } | null;
            const isWinner = bestCtr !== null && ad.metrics?.ctr === bestCtr;
            const isLow = worstCtr !== null && ad.metrics?.ctr === worstCtr && worstCtr !== bestCtr;

            return (
              <div key={ad.id} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                  {isWinner && <Badge className="bg-green-600 text-xs">Mejor</Badge>}
                  {isLow && <Badge variant="destructive" className="text-xs">Bajo rendimiento</Badge>}
                  {creative?.format && (
                    <Badge variant="outline" className="text-xs">{creative.format}</Badge>
                  )}
                </div>
                <h4 className="font-medium text-sm truncate mb-1">{ad.name}</h4>
                {creative?.headline && (
                  <p className="text-xs text-muted-foreground truncate">{creative.headline}</p>
                )}
                {creative?.primary_text && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{creative.primary_text}</p>
                )}
                {ad.metrics && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Impresiones</p>
                      <p className="text-sm font-medium">{ad.metrics.impressions.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                      <p className="text-sm font-medium">{ad.metrics.clicks.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Inversión</p>
                      <p className="text-sm font-medium">${ad.metrics.spend.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CTR</p>
                      <p className="text-sm font-medium">{ad.metrics.ctr.toFixed(2)}%</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
