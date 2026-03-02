'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'React Error Boundary caught error',
      error: { name: error.name, message: error.message, stack: error.stack },
      componentStack: errorInfo.componentStack,
    }));
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Algo salió mal</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Ocurrió un error inesperado. Por favor, intenta recargar la página.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => this.setState({ hasError: false, error: null, showDetails: false })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
            <Button
              variant="outline"
              onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
            >
              {this.state.showDetails ? 'Ocultar detalles' : 'Ver detalles'}
            </Button>
          </div>
          {this.state.showDetails && this.state.error && (
            <pre className="mt-6 p-4 bg-muted rounded-lg text-left text-xs overflow-auto max-w-2xl max-h-60 w-full">
              {this.state.error.message}
              {process.env.NODE_ENV === 'development' && (
                <>
                  {'\n\n'}
                  {this.state.error.stack}
                </>
              )}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
