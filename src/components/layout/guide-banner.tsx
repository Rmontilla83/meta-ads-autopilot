'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';

export function GuideBanner() {
  const { metaConnection, loading } = useUser();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const wasDismissed = localStorage.getItem('guide-banner-dismissed');
    if (!wasDismissed) setDismissed(false);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('guide-banner-dismissed', 'true');
  };

  if (loading || dismissed || metaConnection?.is_active) return null;

  return (
    <div className="mb-6 relative bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center gap-4">
      <div className="shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">Completa tu configuración con nuestra guía paso a paso</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Te enseñamos a crear tu página, cuenta publicitaria y conectar con Meta Ads.
        </p>
      </div>
      <Link href="/guia">
        <Button size="sm" variant="default" className="shrink-0">
          Ver guía
        </Button>
      </Link>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
