'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Circle, Rocket } from 'lucide-react';

interface FunnelPublishModalProps {
  open: boolean;
  onClose: () => void;
  funnelId: string;
  funnelName: string;
  onComplete: () => void;
}

type StepStatus = 'pending' | 'running' | 'success' | 'error';

interface PublishStep {
  key: string;
  label: string;
  status: StepStatus;
  message?: string;
}

export function FunnelPublishModal({
  open,
  onClose,
  funnelId,
  funnelName,
  onComplete,
}: FunnelPublishModalProps) {
  const [publishing, setPublishing] = useState(false);
  const [steps, setSteps] = useState<PublishStep[]>([
    { key: 'tofu', label: 'Campaña TOFU (Conocimiento)', status: 'pending' },
    { key: 'mofu', label: 'Campaña MOFU (Consideración)', status: 'pending' },
    { key: 'bofu', label: 'Campaña BOFU (Conversión)', status: 'pending' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const updateStep = (key: string, status: StepStatus, message?: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, status, message } : s))
    );
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    setDone(false);

    // Simulate step progression
    updateStep('tofu', 'running', 'Creando campaña y audiencia...');

    try {
      const res = await fetch('/api/funnels/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnel_id: funnelId }),
      });

      const data = await res.json();

      if (data.success) {
        updateStep('tofu', 'success', 'Campaña TOFU creada');
        updateStep('mofu', 'success', 'Campaña MOFU creada');
        updateStep('bofu', 'success', 'Campaña BOFU creada');
        setDone(true);
        onComplete();
      } else {
        // Determine which step failed based on progress
        const progress = data.progress || [];
        const lastFailed = progress.find((p: { step: string; completed: boolean }) => !p.completed && p.step === 'error');

        if (lastFailed || !data.success) {
          const hasTofu = progress.some((p: { step: string; completed: boolean }) => p.step === 'creating_tofu' && p.completed);
          const hasMofu = progress.some((p: { step: string; completed: boolean }) => p.step === 'creating_mofu' && p.completed);
          const hasBofu = progress.some((p: { step: string; completed: boolean }) => p.step === 'creating_bofu' && p.completed);

          updateStep('tofu', hasTofu ? 'success' : 'error', hasTofu ? 'Creada' : 'Error');
          updateStep('mofu', hasMofu ? 'success' : (hasTofu ? 'error' : 'pending'), hasMofu ? 'Creada' : undefined);
          updateStep('bofu', hasBofu ? 'success' : 'pending');
        }

        setError(data.error || 'Error al publicar el funnel');
      }
    } catch (err) {
      updateStep('tofu', 'error');
      setError(err instanceof Error ? err.message : 'Error de conexion');
    } finally {
      setPublishing(false);
    }
  };

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'pending':
        return <Circle className="h-5 w-5 text-muted-foreground" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !publishing && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Publicar Funnel
          </DialogTitle>
          <DialogDescription>
            Se crearan 3 campañas en Meta Ads para el funnel &ldquo;{funnelName}&rdquo;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.key} className="flex items-center gap-3">
                {getStepIcon(step.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{step.label}</span>
                    {step.status === 'success' && (
                      <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">
                        Completado
                      </Badge>
                    )}
                    {step.status === 'error' && (
                      <Badge variant="outline" className="text-xs text-red-500 border-red-500/30">
                        Error
                      </Badge>
                    )}
                  </div>
                  {step.message && (
                    <p className="text-xs text-muted-foreground">{step.message}</p>
                  )}
                </div>
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-[29px] mt-10 h-3 w-px bg-border" />
                )}
              </div>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* Success message */}
          {done && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm text-green-500">
              Funnel publicado exitosamente. Las 3 campañas estan activas en Meta Ads.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          {!done && !publishing && (
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          )}
          {!done ? (
            <Button onClick={handlePublish} disabled={publishing}>
              {publishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Publicar Funnel
                </>
              )}
            </Button>
          ) : (
            <Button onClick={onClose}>Cerrar</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
