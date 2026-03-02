'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
      <h1 className="text-2xl font-bold mb-2">Algo salió mal</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Ocurrió un error inesperado. Puedes intentar recargar o volver al inicio.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            Ir al inicio
          </Link>
        </Button>
      </div>
    </div>
  );
}
