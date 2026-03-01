'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { GeneratedCampaign } from '@/lib/gemini/types';

interface AIModeProps {
  onGenerate: (campaigns: GeneratedCampaign[]) => void;
}

export function AIMode({ onGenerate }: AIModeProps) {
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState('3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ai/generate-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, count: parseInt(count) || 3 }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al generar');
      }

      const data = await res.json();
      onGenerate(data.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar campañas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Describe tu objetivo</Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ej: Quiero crear campañas de tráfico para mi tienda de ropa con diferentes audiencias..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Cantidad de campañas</Label>
        <Input
          type="number"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          min={1}
          max={10}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleGenerate} disabled={!prompt.trim() || loading} className="w-full">
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        Generar con IA
      </Button>
    </div>
  );
}
