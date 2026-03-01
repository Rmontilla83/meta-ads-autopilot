'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { MetaConnection } from '@/types';

interface UseMetaConnectionReturn {
  connecting: boolean;
  disconnecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => Promise<void>;
  updateSelection: (data: {
    ad_account_id?: string;
    ad_account_name?: string;
    page_id?: string;
    page_name?: string;
    pixel_id?: string;
    pixel_name?: string;
  }) => Promise<void>;
}

export function useMetaConnection(
  connection: MetaConnection | null,
  onUpdate?: () => Promise<void>
): UseMetaConnectionReturn {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const connect = useCallback(() => {
    setConnecting(true);
    setError(null);
    window.location.href = '/api/auth/meta/connect';
  }, []);

  const disconnect = useCallback(async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/meta/disconnect', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to disconnect');
      if (onUpdate) await onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desconectar');
    } finally {
      setDisconnecting(false);
    }
  }, [onUpdate]);

  const updateSelection = useCallback(async (data: {
    ad_account_id?: string;
    ad_account_name?: string;
    page_id?: string;
    page_name?: string;
    pixel_id?: string;
    pixel_name?: string;
  }) => {
    if (!connection) return;
    try {
      const { error: updateError } = await supabase
        .from('meta_connections')
        .update(data)
        .eq('id', connection.id);
      if (updateError) throw updateError;
      if (onUpdate) await onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }, [connection, supabase, onUpdate]);

  return { connecting, disconnecting, error, connect, disconnect, updateSelection };
}
