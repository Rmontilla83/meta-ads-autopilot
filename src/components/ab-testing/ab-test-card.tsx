'use client';

import { useRouter } from 'next/navigation';
import { FlaskConical, Play, Pause, Trophy, Clock, FileText, Image, Users, MessageSquareQuote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ABTest } from '@/types';

interface ABTestCardProps {
  test: ABTest & { campaigns?: { name: string; objective: string; status: string } | null };
}

const STATUS_CONFIG = {
  draft: { label: 'Borrador', variant: 'secondary' as const, color: 'text-zinc-500' },
  running: { label: 'En ejecución', variant: 'default' as const, color: 'text-blue-600' },
  completed: { label: 'Completado', variant: 'default' as const, color: 'text-emerald-600' },
  paused: { label: 'Pausado', variant: 'outline' as const, color: 'text-amber-600' },
};

const TEST_TYPE_CONFIG = {
  copy: { label: 'Copy', icon: FileText },
  creative: { label: 'Creativos', icon: Image },
  audience: { label: 'Audiencias', icon: Users },
  hook: { label: 'Hooks', icon: MessageSquareQuote },
  multivariate: { label: 'Multivariante', icon: FlaskConical },
};

export function ABTestCard({ test }: ABTestCardProps) {
  const router = useRouter();
  const statusConfig = STATUS_CONFIG[test.status] || STATUS_CONFIG.draft;
  const typeConfig = TEST_TYPE_CONFIG[test.test_type] || TEST_TYPE_CONFIG.copy;
  const TypeIcon = typeConfig.icon;

  // Find winner variant name
  const winnerVariant = test.winner_variant_id
    ? test.variants?.find((v) => v.id === test.winner_variant_id)
    : null;

  const variantCount = test.variants?.length || 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => router.push(`/campaigns/${test.campaign_id}/ab-test`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('p-1.5 rounded-md bg-zinc-100', statusConfig.color)}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">{test.name}</CardTitle>
              {test.campaigns && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Campaña: {test.campaigns.name}
                </p>
              )}
            </div>
          </div>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Type and variants */}
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary" className="text-xs">
              {typeConfig.label}
            </Badge>
            <span className="text-muted-foreground">
              {variantCount} variantes
            </span>
          </div>

          {/* Winner badge */}
          {test.status === 'completed' && winnerVariant && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-md px-3 py-2">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-medium">
                Ganador: {winnerVariant?.name || 'Variante'}
              </span>
            </div>
          )}

          {/* Status indicator */}
          {test.status === 'running' && (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 rounded-md px-3 py-2">
              <Play className="h-4 w-4" />
              <span className="text-sm">
                En ejecución desde {formatDate(test.started_at)}
              </span>
            </div>
          )}

          {test.status === 'paused' && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-md px-3 py-2">
              <Pause className="h-4 w-4" />
              <span className="text-sm">Test pausado</span>
            </div>
          )}

          {/* Dates and duration */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Creado {formatDate(test.created_at)}</span>
            </div>
            <span>{test.test_duration_days} días de duración</span>
          </div>

          {/* Action */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/campaigns/${test.campaign_id}/ab-test`);
            }}
          >
            {test.status === 'draft' ? 'Configurar' : 'Ver resultados'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
