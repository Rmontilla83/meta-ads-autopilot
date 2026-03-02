'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical, Loader2, Plus, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { ABTestCard } from '@/components/ab-testing/ab-test-card';
import type { ABTest } from '@/types';

export default function ABTestsPage() {
  const router = useRouter();
  const { user, planLimits, loading: userLoading } = useUser();
  const [tests, setTests] = useState<(ABTest & { campaigns?: { name: string; objective: string; status: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchTests = async () => {
      try {
        const res = await fetch('/api/ab-tests');
        if (res.ok) {
          const data = await res.json();
          setTests(data.tests || []);
        }
      } catch {
        toast.error('Error al cargar los A/B tests');
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [user]);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Plan gate: show upgrade if not allowed
  if (!planLimits.abTesting) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing</h1>
          <p className="text-muted-foreground mt-1">
            Optimiza tus campañas con pruebas A/B automatizadas.
          </p>
        </div>
        <Card>
          <CardHeader className="text-center py-12">
            <div className="flex justify-center mb-4">
              <Lock className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle>A/B Testing disponible en el plan Growth</CardTitle>
            <CardDescription className="max-w-md mx-auto mt-2">
              Prueba diferentes textos, creativos y audiencias para encontrar la combinación ganadora.
              Nuestro motor de significancia estadística declara ganadores automáticamente.
            </CardDescription>
            <div className="mt-6">
              <Button onClick={() => router.push('/pricing')}>
                Ver planes
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing</h1>
          <p className="text-muted-foreground mt-1">
            {tests.length} {tests.length === 1 ? 'test' : 'tests'} creados
          </p>
        </div>
        <Button onClick={() => router.push('/campaigns')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo A/B Test
        </Button>
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardHeader className="text-center py-12">
            <div className="flex justify-center mb-4">
              <FlaskConical className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle>No tienes A/B tests aún</CardTitle>
            <CardDescription className="max-w-md mx-auto mt-2">
              Selecciona una campaña activa para crear tu primer A/B test.
              La IA generará variantes y el sistema declarará al ganador automáticamente.
            </CardDescription>
            <div className="mt-6">
              <Button onClick={() => router.push('/campaigns')}>
                <Plus className="h-4 w-4 mr-2" />
                Ir a campañas
              </Button>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <ABTestCard key={test.id} test={test} />
          ))}
        </div>
      )}
    </div>
  );
}
