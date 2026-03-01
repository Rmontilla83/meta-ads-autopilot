'use client';

import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { MetaConnection } from '@/types';

interface MetaConnectionStatusProps {
  connection: MetaConnection | null;
  loading?: boolean;
  compact?: boolean;
}

export function MetaConnectionStatus({ connection, loading, compact }: MetaConnectionStatusProps) {
  if (loading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        {!compact && <span>Cargando...</span>}
      </Badge>
    );
  }

  if (!connection?.is_active) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        {!compact && <span>Meta desconectado</span>}
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
      <CheckCircle2 className="h-3 w-3" />
      {!compact && <span>Meta conectado</span>}
    </Badge>
  );
}
