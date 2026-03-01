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

interface AiAnalysisProps {
  campaignId: string;
}

export function AiAnalysis({ campaignId }: AiAnalysisProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/analyze-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al analizar');
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Análisis de IA
          </CardTitle>
          {suggestions.length > 0 && (
            <Button variant="outline" size="sm" onClick={analyze} disabled={loading}>
              Actualizar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 && !loading && !error && (
          <div className="text-center py-6">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Analiza el rendimiento de tu campaña con inteligencia artificial para obtener
              recomendaciones de mejora personalizadas.
            </p>
            <Button onClick={analyze}>
              <Sparkles className="h-4 w-4 mr-2" />
              Analizar con IA
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Analizando rendimiento...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-6">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={analyze}>Reintentar</Button>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-3">
            {suggestions.map((s, i) => {
              const priority = PRIORITY_CONFIG[s.priority];
              return (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <Badge variant={priority.variant} className="text-xs shrink-0 mt-0.5">
                      {priority.label}
                    </Badge>
                    <p className="font-medium text-sm">{s.recommendation}</p>
                  </div>
                  <div className="ml-[52px] space-y-1">
                    <p className="text-sm text-muted-foreground">{s.action}</p>
                    <p className="text-xs text-muted-foreground italic">
                      Impacto esperado: {s.expected_impact}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
