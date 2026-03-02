'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ArrowRight, Loader2, Target, Users, ShoppingCart, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CampaignExpressModal } from './campaign-express-modal';
import type { CampaignExpressResult } from '@/lib/gemini/campaign-express';

const QUICK_GOALS = [
  { label: 'Más tráfico web', icon: Target, goal: 'Aumentar el tráfico a mi sitio web' },
  { label: 'Generar leads', icon: Users, goal: 'Generar clientes potenciales y captar contactos' },
  { label: 'Más ventas', icon: ShoppingCart, goal: 'Aumentar las ventas y conversiones de mi negocio' },
  { label: 'Reconocimiento', icon: MessageSquare, goal: 'Aumentar el reconocimiento de mi marca' },
];

const LOADING_STEPS = [
  'Analizando tu negocio...',
  'Consultando personas compradoras...',
  'Revisando campañas anteriores...',
  'Diseñando estrategia...',
  'Creando audiencias...',
  'Generando anuncios...',
  'Optimizando presupuesto...',
];

export function CampaignExpressCard() {
  const router = useRouter();
  const [customGoal, setCustomGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<CampaignExpressResult | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleGenerate = async (goal: string) => {
    if (!goal.trim()) {
      toast.error('Describe tu objetivo para la campaña');
      return;
    }
    setLoading(true);
    setLoadingStep(0);

    // Animate through loading steps
    const interval = setInterval(() => {
      setLoadingStep(prev => {
        if (prev >= LOADING_STEPS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 2500);

    try {
      const res = await fetch('/api/ai/campaign-express', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.upgrade) {
          toast.error(data.error);
          return;
        }
        throw new Error(data.error || 'Error al generar');
      }

      const data = await res.json();
      setResult(data);
      setShowModal(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar la campaña express');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleSaveAndEdit = async () => {
    if (!result) return;

    try {
      const res = await fetch('/api/campaigns/publish', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: result.campaign.name,
          objective: result.campaign.objective,
          campaign_data: result,
        }),
      });

      if (!res.ok) {
        // Fallback: save via Supabase client directly
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autorizado');

        const { data, error } = await supabase
          .from('campaigns')
          .insert({
            user_id: user.id,
            name: result.campaign.name,
            status: 'draft',
            objective: result.campaign.objective,
            campaign_data: result as unknown as Record<string, unknown>,
          })
          .select('id')
          .single();

        if (error) throw error;
        router.push(`/campaigns/${data.id}/edit`);
        return;
      }

      const { campaignId } = await res.json();
      router.push(`/campaigns/${campaignId}/edit`);
    } catch {
      toast.error('Error al guardar la campaña');
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-amber-500/5">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">{LOADING_STEPS[loadingStep]}</p>
          <div className="flex justify-center gap-1 mt-4">
            {LOADING_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full transition-colors ${i <= loadingStep ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-amber-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Campaña Express</CardTitle>
              <CardDescription>Genera una campaña completa con un clic usando toda la info de tu negocio</CardDescription>
            </div>
            <Badge variant="secondary" className="ml-auto">IA</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick goal cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK_GOALS.map((qg) => (
              <button
                key={qg.label}
                onClick={() => handleGenerate(qg.goal)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-center"
              >
                <qg.icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">{qg.label}</span>
              </button>
            ))}
          </div>

          {/* Custom goal */}
          <div className="flex gap-2">
            <Input
              placeholder="Describe tu objetivo personalizado..."
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate(customGoal)}
            />
            <Button onClick={() => handleGenerate(customGoal)} disabled={!customGoal.trim()}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <CampaignExpressModal
          open={showModal}
          onClose={() => setShowModal(false)}
          result={result}
          onSaveAndEdit={handleSaveAndEdit}
          onRegenerate={(goal) => {
            setShowModal(false);
            handleGenerate(goal);
          }}
        />
      )}
    </>
  );
}
