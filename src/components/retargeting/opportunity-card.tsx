'use client';

import { Users, Clock, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

interface OpportunityCardProps {
  opportunity: RetargetingOpportunity;
  onCreateCampaign: (opportunity: RetargetingOpportunity) => void;
  creating: boolean;
}

const AUDIENCE_TYPE_LABELS: Record<string, string> = {
  website_visitors: 'Visitantes del sitio',
  engaged_users: 'Usuarios interesados',
  video_viewers: 'Espectadores de video',
  lead_form_openers: 'Formularios abiertos',
  past_purchasers: 'Compradores anteriores',
  page_visitors: 'Visitantes de página',
  add_to_cart: 'Carrito abandonado',
};

const AUDIENCE_TYPE_COLORS: Record<string, string> = {
  website_visitors: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  engaged_users: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  video_viewers: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  lead_form_openers: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  past_purchasers: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  page_visitors: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  add_to_cart: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function OpportunityCard({ opportunity, onCreateCampaign, creating }: OpportunityCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{opportunity.name}</CardTitle>
          <Badge
            variant="secondary"
            className={AUDIENCE_TYPE_COLORS[opportunity.audience_type] || ''}
          >
            {AUDIENCE_TYPE_LABELS[opportunity.audience_type] || opportunity.audience_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audience info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{opportunity.estimated_size}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{opportunity.retention_days} dias</span>
          </div>
        </div>

        {/* Suggested copy */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            Copy sugerido
          </div>
          <p className="text-sm font-medium">{opportunity.copy.headline}</p>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {opportunity.copy.primary_text}
          </p>
        </div>

        {/* Offer suggestion */}
        {opportunity.offer_suggestion && (
          <div className="flex items-start gap-2 rounded-lg border p-3">
            <Sparkles className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Oferta sugerida</p>
              <p className="text-sm">{opportunity.offer_suggestion}</p>
            </div>
          </div>
        )}

        {/* Rationale */}
        <p className="text-sm text-muted-foreground">{opportunity.rationale}</p>

        {/* CTA */}
        <Button
          className="w-full"
          onClick={() => onCreateCampaign(opportunity)}
          disabled={creating}
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creando...
            </>
          ) : (
            'Crear campana de retargeting'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
