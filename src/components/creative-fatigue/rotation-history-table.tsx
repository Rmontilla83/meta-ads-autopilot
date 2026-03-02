'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { CreativeRotation } from '@/types';

interface EnrichedRotation extends CreativeRotation {
  ad_name?: string;
  replacement_ad_name?: string | null;
  campaign_name?: string;
}

interface RotationHistoryTableProps {
  rotations: EnrichedRotation[];
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  healthy: { label: 'Saludable', variant: 'secondary' },
  warning: { label: 'En riesgo', variant: 'outline' },
  fatigued: { label: 'Fatigado', variant: 'destructive' },
  rotated: { label: 'Rotado', variant: 'default' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function RotationHistoryTable({ rotations }: RotationHistoryTableProps) {
  if (!rotations.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No hay historial de rotaciones de creativos.</p>
        <p className="text-xs mt-1">Las rotaciones apareceran aqui cuando se detecte fatiga creativa.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ad original</TableHead>
            <TableHead>Campana</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">CTR base</TableHead>
            <TableHead className="text-right">Caida CTR</TableHead>
            <TableHead className="text-right">Frecuencia</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Reemplazo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rotations.map((rotation) => {
            const config = statusConfig[rotation.status] || statusConfig.healthy;

            return (
              <TableRow key={rotation.id}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {rotation.ad_name || 'Sin nombre'}
                </TableCell>
                <TableCell className="max-w-[150px] truncate text-muted-foreground">
                  {rotation.campaign_name || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={config.variant}>
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {rotation.ctr_baseline.toFixed(2)}%
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={
                    rotation.ctr_drop_percentage > 20 ? 'text-red-500' :
                    rotation.ctr_drop_percentage > 10 ? 'text-yellow-500' :
                    'text-foreground'
                  }>
                    -{rotation.ctr_drop_percentage.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={
                    rotation.frequency_at_detection > 3.0 ? 'text-red-500' :
                    rotation.frequency_at_detection > 2.0 ? 'text-yellow-500' :
                    'text-foreground'
                  }>
                    {rotation.frequency_at_detection.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(rotation.detected_at)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {rotation.status === 'rotated' ? (
                    <span className="text-green-600 dark:text-green-400 text-sm">
                      {rotation.replacement_ad_name || 'Creativo nuevo'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
