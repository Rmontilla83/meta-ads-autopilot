'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import type { RuleExecution } from '@/types';

interface RuleHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleId: string;
  ruleName: string;
}

export function RuleHistoryModal({
  open,
  onOpenChange,
  ruleId,
  ruleName,
}: RuleHistoryModalProps) {
  const [executions, setExecutions] = useState<RuleExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !ruleId) return;

    const fetchExecutions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/automation-rules/${ruleId}/executions`);
        if (res.ok) {
          const data = await res.json();
          setExecutions(data.executions);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchExecutions();
  }, [open, ruleId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial: {ruleName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : executions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Esta regla aún no se ha ejecutado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Campaña</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Métrica</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((exec) => (
                <TableRow key={exec.id}>
                  <TableCell className="text-xs">
                    {new Date(exec.created_at).toLocaleString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {exec.campaign_name || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {exec.action_taken}
                  </TableCell>
                  <TableCell className="text-sm">
                    {Number(exec.metric_value).toFixed(2)} / {Number(exec.threshold_value).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={exec.success ? 'default' : 'destructive'}>
                      {exec.success ? 'OK' : 'Error'}
                    </Badge>
                    {exec.error_message && (
                      <p className="text-xs text-destructive mt-1">{exec.error_message}</p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
