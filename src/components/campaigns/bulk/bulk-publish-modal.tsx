'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { GeneratedCampaign } from '@/lib/gemini/types';

interface BulkPublishEvent {
  type: 'progress' | 'result' | 'done';
  index?: number;
  total?: number;
  name?: string;
  status?: string;
  error?: string;
  success?: number;
  errors?: number;
  campaign_id?: string;
  meta_campaign_id?: string;
}

interface BulkPublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaigns: GeneratedCampaign[];
  onComplete: () => void;
}

export function BulkPublishModal({
  open,
  onOpenChange,
  campaigns,
  onComplete,
}: BulkPublishModalProps) {
  const [publishing, setPublishing] = useState(false);
  const [events, setEvents] = useState<BulkPublishEvent[]>([]);
  const [done, setDone] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const eventsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eventsRef.current) {
      eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
    }
  }, [events]);

  const handlePublish = async () => {
    setPublishing(true);
    setEvents([]);
    setDone(false);
    setCurrentIndex(0);

    try {
      const res = await fetch('/api/campaigns/bulk-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaigns }),
      });

      if (!res.ok) {
        const data = await res.json();
        setEvents([{ type: 'done', success: 0, errors: campaigns.length }]);
        setDone(true);
        console.error('Bulk publish error:', data.error);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as BulkPublishEvent;
            setEvents(prev => [...prev, event]);

            if (event.type === 'progress' && event.index !== undefined) {
              setCurrentIndex(event.index);
            }
            if (event.type === 'done') {
              setDone(true);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch {
      toast.error('Error en la publicación masiva');
      setDone(true);
    } finally {
      setPublishing(false);
    }
  };

  const progress = campaigns.length > 0 ? ((currentIndex + (done ? 1 : 0)) / campaigns.length) * 100 : 0;
  const results = events.filter(e => e.type === 'result');
  const summary = events.find(e => e.type === 'done');

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!publishing) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Publicar {campaigns.length} campañas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!publishing && !done && (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Se publicarán {campaigns.length} campañas en tu cuenta de Meta Ads.
                Este proceso puede tomar varios minutos.
              </p>
              <Button onClick={handlePublish} className="w-full">
                Iniciar publicación
              </Button>
            </div>
          )}

          {(publishing || done) && (
            <>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                {done
                  ? `Completado: ${summary?.success || 0} exitosas, ${summary?.errors || 0} con errores`
                  : `Publicando campaña ${currentIndex + 1} de ${campaigns.length}...`}
              </p>

              <div ref={eventsRef} className="max-h-[240px] overflow-y-auto space-y-2">
                {results.map((event, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm rounded-md p-2 bg-muted/50"
                  >
                    {event.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ) : event.status === 'error' ? (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    )}
                    <span className="flex-1 truncate">{event.name}</span>
                    <Badge variant={event.status === 'success' ? 'default' : 'destructive'}>
                      {event.status === 'success' ? 'OK' : 'Error'}
                    </Badge>
                  </div>
                ))}
              </div>

              {done && (
                <Button
                  onClick={() => { onOpenChange(false); onComplete(); }}
                  className="w-full"
                >
                  Cerrar
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
