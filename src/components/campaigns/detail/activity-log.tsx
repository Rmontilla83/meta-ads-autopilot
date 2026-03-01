'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, Pause, Play, AlertCircle } from 'lucide-react';
import type { Campaign } from '@/types';

interface ActivityLogProps {
  campaign: Campaign;
}

export function ActivityLog({ campaign }: ActivityLogProps) {
  // Build timeline from campaign data
  const events: Array<{ date: string; label: string; icon: typeof FileText }> = [];

  events.push({
    date: campaign.created_at,
    label: 'Campaña creada',
    icon: FileText,
  });

  if (campaign.published_at) {
    events.push({
      date: campaign.published_at,
      label: 'Publicada en Meta Ads',
      icon: Upload,
    });
  }

  if (campaign.status === 'paused') {
    events.push({
      date: campaign.updated_at,
      label: 'Campaña pausada',
      icon: Pause,
    });
  }

  if (campaign.status === 'active' && campaign.published_at && campaign.updated_at !== campaign.published_at) {
    events.push({
      date: campaign.updated_at,
      label: 'Campaña activada',
      icon: Play,
    });
  }

  if (campaign.status === 'error') {
    events.push({
      date: campaign.updated_at,
      label: 'Error en la campaña',
      icon: AlertCircle,
    });
  }

  // Sort by date descending (most recent first)
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actividad</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
          <div className="space-y-4">
            {events.map((event, i) => {
              const Icon = event.icon;
              return (
                <div key={i} className="flex items-start gap-3 relative">
                  <div className="bg-background border rounded-full p-1 z-10">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{event.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.date).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
