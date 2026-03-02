'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface Hook {
  hook: string;
  type: string;
  viral_score: number;
  primary_text: string;
  headline: string;
  description: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface HookGeneratorModalProps {
  campaigns: Campaign[];
  selectedCampaignId: string;
  trigger?: React.ReactNode;
}

const HOOK_TYPE_LABELS: Record<string, string> = {
  pregunta_provocadora: 'Pregunta',
  estadistica_impactante: 'Estadistica',
  promesa_beneficio: 'Beneficio',
  historia_personal: 'Historia',
  contraintuitivo: 'Contraintuitivo',
  urgencia: 'Urgencia',
  dolor_frustracion: 'Dolor',
  curiosidad: 'Curiosidad',
  social_proof: 'Social Proof',
  desafio: 'Desafio',
};

export function HookGeneratorModal({ campaigns, selectedCampaignId, trigger }: HookGeneratorModalProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [selectedHooks, setSelectedHooks] = useState<Set<number>>(new Set());
  const [creatingTest, setCreatingTest] = useState(false);

  const handleGenerate = async () => {
    if (!selectedCampaignId) {
      toast.error('Selecciona una campana primero');
      return;
    }

    setGenerating(true);
    setHooks([]);
    setSelectedHooks(new Set());

    try {
      const res = await fetch('/api/hooks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: selectedCampaignId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al generar hooks');
      }

      setHooks(data.hooks || []);
      toast.success(`Se generaron ${data.hooks?.length || 0} hooks`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al generar hooks');
    } finally {
      setGenerating(false);
    }
  };

  const toggleHook = (index: number) => {
    setSelectedHooks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        if (next.size >= 5) {
          toast.error('Puedes seleccionar maximo 5 hooks');
          return prev;
        }
        next.add(index);
      }
      return next;
    });
  };

  const handleCreateTest = async () => {
    if (selectedHooks.size < 3) {
      toast.error('Selecciona al menos 3 hooks para crear el test');
      return;
    }

    setCreatingTest(true);

    try {
      const selectedHookData = Array.from(selectedHooks).map((i) => hooks[i]);
      const campaignName = campaigns.find((c) => c.id === selectedCampaignId)?.name || 'Campana';

      // Create variants from selected hooks
      const variants = selectedHookData.map((h, i) => ({
        name: `Hook ${i + 1}: ${h.type}`,
        type: 'hook',
        config: {
          hook: h.hook,
          copy: {
            primary_text: h.primary_text,
            headline: h.headline,
            description: h.description,
          },
        },
      }));

      const res = await fetch('/api/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          name: `Test de Hooks - ${campaignName}`,
          test_type: 'hook',
          success_metric: 'ctr',
          test_duration_days: 7,
          auto_winner_enabled: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el A/B test');
      }

      toast.success('A/B Test de hooks creado correctamente');
      setOpen(false);
      setHooks([]);
      setSelectedHooks(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear el test');
    } finally {
      setCreatingTest(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Generar hooks
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generador de Hooks
          </DialogTitle>
          <DialogDescription>
            Genera 10 hooks creativos para tu campana y selecciona los mejores para crear un A/B test.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Generate button */}
          {hooks.length === 0 && (
            <Button
              onClick={handleGenerate}
              disabled={generating || !selectedCampaignId}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando 10 hooks...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generar 10 hooks
                </>
              )}
            </Button>
          )}

          {/* Hooks list */}
          {hooks.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Selecciona 3-5 hooks para crear un A/B test ({selectedHooks.size} seleccionados)
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Regenerar'
                  )}
                </Button>
              </div>

              <div className="space-y-3">
                {hooks.map((hook, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-colors ${
                      selectedHooks.has(index) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleHook(index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedHooks.has(index)}
                          onCheckedChange={() => toggleHook(index)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {HOOK_TYPE_LABELS[hook.type] || hook.type}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 10 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    i < hook.viral_score
                                      ? 'bg-primary'
                                      : 'bg-muted'
                                  }`}
                                />
                              ))}
                              <span className="text-xs text-muted-foreground ml-1">
                                {hook.viral_score}/10
                              </span>
                            </div>
                          </div>
                          <p className="font-medium text-sm">&ldquo;{hook.hook}&rdquo;</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {hook.primary_text}
                          </p>
                          <p className="text-xs font-medium text-muted-foreground">
                            {hook.headline}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

              {/* Create test button */}
              <Button
                onClick={handleCreateTest}
                disabled={selectedHooks.size < 3 || creatingTest}
                className="w-full"
              >
                {creatingTest ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando A/B test...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Crear A/B test con {selectedHooks.size} hooks
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
