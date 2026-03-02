'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error]', error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Algo salió mal
          </h1>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            Ocurrió un error crítico. Por favor, recarga la página.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1.5rem',
              border: '1px solid #333',
              borderRadius: '0.375rem',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
