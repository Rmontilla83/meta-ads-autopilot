'use client';

import {
  Target, Users, Megaphone, DollarSign, BarChart3,
  ChevronDown, Eye, MousePointerClick, UserPlus
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdPreviewMock } from './ad-preview-mock';
import type { GeneratedCampaign } from '@/lib/gemini/types';

interface CampaignPreviewProps {
  campaign: GeneratedCampaign | null;
}

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_AWARENESS: 'Reconocimiento',
  OUTCOME_TRAFFIC: 'Tráfico',
  OUTCOME_ENGAGEMENT: 'Interacción',
  OUTCOME_LEADS: 'Clientes potenciales',
  OUTCOME_SALES: 'Ventas',
  OUTCOME_APP_PROMOTION: 'Promoción de app',
};

const OBJECTIVE_ICONS: Record<string, typeof Eye> = {
  OUTCOME_AWARENESS: Eye,
  OUTCOME_TRAFFIC: MousePointerClick,
  OUTCOME_ENGAGEMENT: Megaphone,
  OUTCOME_LEADS: UserPlus,
  OUTCOME_SALES: DollarSign,
  OUTCOME_APP_PROMOTION: Target,
};

export function CampaignPreview({ campaign }: CampaignPreviewProps) {
  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-4">
          <Megaphone className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Tu campaña aparecerá aquí</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Describe tu negocio y objetivos en el chat para que la IA genere una campaña personalizada.
        </p>
      </div>
    );
  }

  const { strategy, campaign: campaignData, ad_sets, ads } = campaign;
  const ObjectiveIcon = OBJECTIVE_ICONS[strategy.objective] || Target;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">{campaignData.name}</h2>
        <Badge variant="secondary">
          <ObjectiveIcon className="h-3 w-3 mr-1" />
          {OBJECTIVE_LABELS[strategy.objective] || strategy.objective}
        </Badge>
      </div>

      <Accordion type="multiple" defaultValue={['strategy', 'audiences', 'ads', 'budget', 'results']}>
        {/* Strategy */}
        <AccordionItem value="strategy">
          <AccordionTrigger className="text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Estrategia
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground mb-3">{strategy.rationale}</p>
            {strategy.optimization_tips.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Consejos de optimización:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {strategy.optimization_tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-green-500 mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Audiences */}
        <AccordionItem value="audiences">
          <AccordionTrigger className="text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Audiencias ({ad_sets.length} ad sets)
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {ad_sets.map((adSet, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium mb-2">{adSet.name}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {adSet.targeting.age_min}-{adSet.targeting.age_max} años
                      </Badge>
                      {adSet.targeting.genders[0] !== 0 && (
                        <Badge variant="outline" className="text-xs">
                          {adSet.targeting.genders.includes(1) ? '♂' : ''}
                          {adSet.targeting.genders.includes(2) ? '♀' : ''}
                        </Badge>
                      )}
                      {adSet.targeting.geo_locations.countries?.map((c) => (
                        <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                      ))}
                      {adSet.targeting.interests?.slice(0, 3).map((interest) => (
                        <Badge key={interest.id} variant="secondary" className="text-xs">
                          {interest.name}
                        </Badge>
                      ))}
                      {(adSet.targeting.interests?.length || 0) > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(adSet.targeting.interests?.length || 0) - 3} más
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{adSet.budget_percentage}% del presupuesto</span>
                      <span>·</span>
                      <span>{adSet.placements.join(', ')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Ads */}
        <AccordionItem value="ads">
          <AccordionTrigger className="text-sm font-semibold">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Anuncios ({ads.length})
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Tabs defaultValue="feed">
              <TabsList className="mb-3">
                <TabsTrigger value="feed" className="text-xs">Feed</TabsTrigger>
                <TabsTrigger value="stories" className="text-xs">Stories</TabsTrigger>
                <TabsTrigger value="reels" className="text-xs">Reels</TabsTrigger>
              </TabsList>
              {(['feed', 'stories', 'reels'] as const).map((mode) => (
                <TabsContent key={mode} value={mode}>
                  <div className={`flex gap-4 overflow-x-auto pb-2 ${mode !== 'feed' ? 'flex-row' : 'flex-col items-center'}`}>
                    {ads.map((ad, i) => (
                      <div key={i} className="flex-shrink-0">
                        <p className="text-xs font-medium mb-2 text-center">{ad.name}</p>
                        <AdPreviewMock
                          format={ad.format}
                          primaryText={ad.primary_text}
                          headline={ad.headline}
                          description={ad.description}
                          callToAction={ad.call_to_action}
                          viewMode={mode}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </AccordionContent>
        </AccordionItem>

        {/* Budget */}
        <AccordionItem value="budget">
          <AccordionTrigger className="text-sm font-semibold">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Presupuesto (${campaignData.daily_budget}/día)
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {ad_sets.map((adSet, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{adSet.name}</span>
                    <span className="font-medium">
                      ${((campaignData.daily_budget * adSet.budget_percentage) / 100).toFixed(2)}/día
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${adSet.budget_percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-2">
                Presupuesto mensual estimado: ${(campaignData.daily_budget * 30).toFixed(2)} USD
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Estimated Results */}
        <AccordionItem value="results">
          <AccordionTrigger className="text-sm font-semibold">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Resultados estimados
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Alcance diario</p>
                  <p className="text-lg font-bold">
                    {strategy.estimated_results.daily_reach_min.toLocaleString()}-
                    {strategy.estimated_results.daily_reach_max.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Clics diarios</p>
                  <p className="text-lg font-bold">
                    {strategy.estimated_results.daily_clicks_min}-
                    {strategy.estimated_results.daily_clicks_max}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">CPA estimado</p>
                  <p className="text-lg font-bold">
                    ${strategy.estimated_results.estimated_cpa_min}-
                    ${strategy.estimated_results.estimated_cpa_max}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">CTR estimado</p>
                  <p className="text-lg font-bold">
                    {strategy.estimated_results.estimated_ctr}%
                  </p>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
