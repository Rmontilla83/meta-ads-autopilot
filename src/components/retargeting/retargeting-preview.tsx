'use client';

import { Users, Target, MessageSquare, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface RetargetingPreviewProps {
  opportunity: {
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
  };
}

export function RetargetingPreview({ opportunity }: RetargetingPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Vista previa de retargeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audience Section */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
            <Users className="h-4 w-4" />
            Audiencia
          </h4>
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tipo</span>
              <Badge variant="outline">{opportunity.audience_type}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Retención</span>
              <span>{opportunity.retention_days} dias</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tamaño estimado</span>
              <span>{opportunity.estimated_size}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Copy Section */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
            <MessageSquare className="h-4 w-4" />
            Copy del anuncio
          </h4>
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm">{opportunity.copy.primary_text}</p>
            <Separator />
            <p className="font-medium text-sm">{opportunity.copy.headline}</p>
            {opportunity.copy.description && (
              <p className="text-xs text-muted-foreground">{opportunity.copy.description}</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Offer Section */}
        {opportunity.offer_suggestion && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
              <Gift className="h-4 w-4" />
              Oferta
            </h4>
            <p className="text-sm text-muted-foreground">{opportunity.offer_suggestion}</p>
          </div>
        )}

        {/* Rationale */}
        <div className="rounded-lg bg-primary/5 border-primary/20 border p-3">
          <p className="text-xs font-medium text-primary mb-1">Razonamiento</p>
          <p className="text-sm text-muted-foreground">{opportunity.rationale}</p>
        </div>
      </CardContent>
    </Card>
  );
}
