'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, XCircle, ExternalLink, RotateCcw, PartyPopper } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
}

interface StepStatus {
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  message?: string;
}

export function PublishModal({ open, onOpenChange, campaignId, campaignName }: PublishModalProps) {
  const [publishing, setPublishing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metaCampaignId, setMetaCampaignId] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepStatus[]>([
    { label: 'Validando campaña', status: 'pending' },
    { label: 'Creando campaña', status: 'pending' },
    { label: 'Configurando audiencias', status: 'pending' },
    { label: 'Subiendo creativos', status: 'pending' },
    { label: 'Publicando anuncios', status: 'pending' },
    { label: 'Activando campaña', status: 'pending' },
  ]);

  const stepMap: Record<string, number> = {
    validating: 0,
    creating_campaign: 1,
    creating_adsets: 2,
    uploading_creatives: 3,
    creating_ads: 4,
    activating: 5,
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    setFinished(false);

    // Reset steps
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending' as const })));

    try {
      const response = await fetch('/api/campaigns/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId }),
      });

      const data = await response.json();

      if (data.progress) {
        // Update steps from progress
        const updatedSteps = [...steps];
        for (const p of data.progress) {
          const idx = stepMap[p.step];
          if (idx !== undefined) {
            updatedSteps[idx] = {
              ...updatedSteps[idx],
              status: p.completed ? 'done' : p.error ? 'error' : 'active',
              message: p.message,
            };
          }
        }
        setSteps(updatedSteps);
      }

      if (data.success) {
        setMetaCampaignId(data.meta_campaign_id);
        setFinished(true);
        setSteps(prev => prev.map(s => ({ ...s, status: 'done' as const })));
      } else {
        setError(data.error || 'Error al publicar la campaña');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setPublishing(false);
    }
  };

  const handleClose = () => {
    if (!publishing) {
      onOpenChange(false);
      // Reset state after close animation
      setTimeout(() => {
        setFinished(false);
        setError(null);
        setMetaCampaignId(null);
        setSteps(prev => prev.map(s => ({ ...s, status: 'pending' as const, message: undefined })));
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {finished ? '¡Campaña publicada!' : 'Publicar campaña'}
          </DialogTitle>
          <DialogDescription>
            {finished
              ? 'Tu campaña está activa en Meta Ads'
              : `Publicar "${campaignName}" en Meta Ads`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {step.status === 'done' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : step.status === 'active' ? (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
              ) : step.status === 'error' ? (
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${step.status === 'pending' ? 'text-muted-foreground' : ''}`}>
                  {step.label}
                </p>
                {step.message && step.status !== 'pending' && (
                  <p className="text-xs text-muted-foreground truncate">{step.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Success state */}
        {finished && (
          <div className="text-center py-4 border-t">
            <PartyPopper className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Tu campaña está activa y generando resultados.
            </p>
            {metaCampaignId && (
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={`https://www.facebook.com/adsmanager/manage/campaigns?act=${metaCampaignId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver en Ads Manager
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePublish}
              disabled={publishing}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        )}

        {/* Initial state */}
        {!publishing && !finished && !error && (
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handlePublish}>
              Publicar ahora
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
