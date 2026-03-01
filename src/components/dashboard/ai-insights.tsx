'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';

interface Suggestion {
  recommendation: string;
  action: string;
  expected_impact: string;
  priority: 'high' | 'medium' | 'low';
}

const PRIORITY_CONFIG = {
  high: { label: 'Alta', variant: 'destructive' as const },
  medium: { label: 'Media', variant: 'default' as const },
  low: { label: 'Baja', variant: 'secondary' as const },
};

interface AiInsightsProps {
  campaignId?: string;
  campaignIds?: string[];
}

export function AiInsights({ campaignId, campaignIds }: AiInsightsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    const targetId = campaignId || campaignIds?.[0];
    if (!targetId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/analyze-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: targetId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al obtener insights');
      }

      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Insights de IA
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 && !loading && !error && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Obtén recomendaciones de mejora basadas en tus métricas.
            </p>
            <Button onClick={fetchInsights} disabled={!campaignId && !campaignIds?.length}>
              <Sparkles className="h-4 w-4 mr-2" />
              Obtener insights
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-6 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Analizando métricas...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchInsights}>
              Reintentar
            </Button>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-3">
            {suggestions.map((s, i) => {
              const priority = PRIORITY_CONFIG[s.priority];
              return (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-1">
                    <Badge variant={priority.variant} className="text-xs shrink-0">
                      {priority.label}
                    </Badge>
                    <p className="text-sm font-medium">{s.recommendation}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.action}</p>
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Impacto esperado: {s.expected_impact}
                  </p>
                </div>
              );
            })}
            <Button variant="outline" size="sm" className="w-full" onClick={fetchInsights}>
              Actualizar análisis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
