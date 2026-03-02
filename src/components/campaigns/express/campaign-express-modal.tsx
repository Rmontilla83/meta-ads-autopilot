'use client';

import { useState } from 'react';
import { Zap, Pencil, RefreshCw, TrendingUp, Users, Megaphone, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import type { CampaignExpressResult } from '@/lib/gemini/campaign-express';

interface Props {
  open: boolean;
  onClose: () => void;
  result: CampaignExpressResult;
  onSaveAndEdit: () => void;
  onRegenerate: (goal: string) => void;
}

function ConfidenceBadge({ score }: { score: number }) {
  const variant = score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'outline';
  return (
    <Badge variant={variant} className="text-sm">
      {score}% confianza
    </Badge>
  );
}

export function CampaignExpressModal({ open, onClose, result, onSaveAndEdit, onRegenerate }: Props) {
  const [regenerateGoal, setRegenerateGoal] = useState('');

  const est = result.strategy.estimated_results;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Campaña Express Generada
            <ConfidenceBadge score={result.confidence_score} />
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Executive Summary */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{result.executive_summary}</p>
                <p className="text-xs text-muted-foreground mt-2 italic">{result.confidence_reasoning}</p>
              </CardContent>
            </Card>

            {/* Campaign Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  Campaña
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nombre</span>
                  <span className="font-medium">{result.campaign.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Objetivo</span>
                  <Badge variant="outline">{result.campaign.objective.replace('OUTCOME_', '')}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Presupuesto diario</span>
                  <span className="font-medium">${result.campaign.daily_budget}/día</span>
                </div>
              </CardContent>
            </Card>

            {/* Estimated Results */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Resultados Estimados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Alcance diario</p>
                    <p className="font-medium">{est.daily_reach_min.toLocaleString()} - {est.daily_reach_max.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Clicks diarios</p>
                    <p className="font-medium">{est.daily_clicks_min} - {est.daily_clicks_max}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CPA estimado</p>
                    <p className="font-medium">${est.estimated_cpa_min.toFixed(2)} - ${est.estimated_cpa_max.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CTR estimado</p>
                    <p className="font-medium">{est.estimated_ctr}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ad Sets */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {result.ad_sets.length} Audiencia{result.ad_sets.length > 1 ? 's' : ''}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.ad_sets.map((adSet, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <span>{adSet.name}</span>
                    <Badge variant="outline">{adSet.budget_percentage}%</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Ads Preview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  {result.ads.length} Anuncio{result.ads.length > 1 ? 's' : ''}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.ads.map((ad, i) => (
                  <div key={i} className="p-3 border rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{ad.name}</span>
                      <Badge variant="secondary" className="text-xs">{ad.format}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{ad.primary_text}</p>
                    <p className="text-xs font-medium">{ad.headline}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Optimization Tips */}
            {result.strategy.optimization_tips.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Tips de Optimización
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {result.strategy.optimization_tips.map((tip, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2 border-t">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={onSaveAndEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Ajustar en Editor
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Regenerar con nuevo objetivo..."
              value={regenerateGoal}
              onChange={(e) => setRegenerateGoal(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRegenerate(regenerateGoal || 'Mejorar la campaña anterior')}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
