'use client';

import { Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ScalingEvent {
  id: string;
  campaign_id: string | null;
  meta_adset_id: string | null;
  scaling_type: string;
  action_detail: Record<string, unknown>;
  success: boolean;
  error_message: string | null;
  reverted: boolean;
  reverted_at: string | null;
  created_at: string;
  campaigns?: { name: string; status: string } | null;
}

interface ScalingHistoryTableProps {
  events: ScalingEvent[];
  onRevert?: (eventId: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  vertical: 'Presupuesto',
  horizontal: 'Duplicar',
  lookalike: 'Lookalike',
  revert: 'Revertido',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDetail(event: ScalingEvent): string {
  const detail = event.action_detail;
  if (event.scaling_type === 'vertical') {
    return `+${detail.amount_percentage || 0}% ($${((detail.previous_budget as number) / 100 || 0).toFixed(0)} -> $${((detail.new_budget as number) / 100 || 0).toFixed(0)})`;
  }
  if (event.scaling_type === 'horizontal') {
    return 'Duplicación de ad set ganador';
  }
  if (event.scaling_type === 'lookalike') {
    return 'Expansión con audiencia lookalike';
  }
  if (event.scaling_type === 'revert') {
    return (detail.reason as string) || 'Revertido';
  }
  return '-';
}

export function ScalingHistoryTable({ events, onRevert }: ScalingHistoryTableProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay eventos de escalado registrados.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campana</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-center">Estado</TableHead>
            <TableHead className="text-center">Revertido</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium">
                {event.campaigns?.name || 'Campana eliminada'}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {TYPE_LABELS[event.scaling_type] || event.scaling_type}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                {getDetail(event)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(event.created_at)}
              </TableCell>
              <TableCell className="text-center">
                {event.success ? (
                  <Badge variant="default" className="bg-green-600">Exitoso</Badge>
                ) : (
                  <Badge variant="destructive">Error</Badge>
                )}
              </TableCell>
              <TableCell className="text-center">
                {event.reverted ? (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                    Si ({event.reverted_at ? formatDate(event.reverted_at) : ''})
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">No</span>
                )}
              </TableCell>
              <TableCell>
                {event.success && !event.reverted && event.scaling_type === 'vertical' && onRevert && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRevert(event.id)}
                    title="Revertir"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
