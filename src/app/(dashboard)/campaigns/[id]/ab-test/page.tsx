'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FlaskConical,
  Loader2,
  Play,
  Pause,
  Trophy,
  Rocket,
  ArrowLeft,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { TestTypeSelector } from '@/components/ab-testing/test-type-selector';
import { VariantPreview } from '@/components/ab-testing/variant-preview';
import { VariantMetricsTable } from '@/components/ab-testing/variant-metrics-table';
import type { ABTest, Campaign } from '@/types';

export default function CampaignABTestPage() {
  const { id: campaignId } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, planLimits, loading: userLoading } = useUser();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [existingTest, setExistingTest] = useState<ABTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Create form state
  const [testType, setTestType] = useState<string | null>(null);
  const [testName, setTestName] = useState('');
  const [successMetric, setSuccessMetric] = useState<string>('ctr');
  const [durationDays, setDurationDays] = useState<string>('14');

  const fetchData = useCallback(async () => {
    if (!user || !campaignId) return;

    try {
      // Fetch campaign
      const supabase = createClient();
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', user.id)
        .single();

      setCampaign(campaignData as Campaign | null);

      // Look for existing tests for this campaign
      const res = await fetch('/api/ab-tests');
      if (res.ok) {
        const data = await res.json();
        const testsForCampaign = (data.tests || []).filter(
          (t: ABTest) => t.campaign_id === campaignId
        );
        // Show the most recent test
        if (testsForCampaign.length > 0) {
          // Fetch full detail for the most recent test
          const detailRes = await fetch(`/api/ab-tests/${testsForCampaign[0].id}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            setExistingTest(detailData.test);
          } else {
            setExistingTest(testsForCampaign[0]);
          }
        }
      }
    } catch {
      toast.error('Error al cargar los datos del A/B test');
    } finally {
      setLoading(false);
    }
  }, [user, campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    if (!testType || !testName.trim()) {
      toast.error('Completa el nombre y tipo de test');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          name: testName.trim(),
          test_type: testType,
          success_metric: successMetric,
          test_duration_days: parseInt(durationDays, 10),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExistingTest(data.test);
        toast.success('A/B test creado exitosamente');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al crear el test');
      }
    } catch {
      toast.error('Error de conexión al crear el test');
    } finally {
      setCreating(false);
    }
  };

  const handleLaunch = async () => {
    if (!existingTest) return;

    setLaunching(true);
    try {
      const res = await fetch(`/api/ab-tests/${existingTest.id}/launch`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setExistingTest(data.test);
        toast.success('A/B test lanzado. Los resultados comenzarán a aparecer pronto.');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al lanzar el test');
      }
    } catch {
      toast.error('Error de conexión al lanzar el test');
    } finally {
      setLaunching(false);
    }
  };

  const handleToggleStatus = async (newStatus: 'paused' | 'running') => {
    if (!existingTest) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/ab-tests/${existingTest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setExistingTest(data.test);
        toast.success(newStatus === 'paused' ? 'Test pausado' : 'Test reanudado');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al cambiar estado');
      }
    } catch {
      toast.error('Error de conexión al cambiar el estado');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclareWinner = async (variantId: string) => {
    if (!existingTest) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/ab-tests/${existingTest.id}/winner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_variant_id: variantId }),
      });

      if (res.ok) {
        const data = await res.json();
        setExistingTest(data.test);
        toast.success('Ganador declarado. Las variantes perdedoras han sido pausadas.');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al declarar ganador');
      }
    } catch {
      toast.error('Error de conexión al declarar ganador');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!existingTest) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/ab-tests/${existingTest.id}`);
      if (res.ok) {
        const data = await res.json();
        setExistingTest(data.test);
        toast.success('Métricas actualizadas');
      }
    } catch {
      toast.error('Error al actualizar métricas');
    } finally {
      setRefreshing(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!planLimits.abTesting) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Card>
          <CardHeader className="text-center py-12">
            <div className="flex justify-center mb-4">
              <Lock className="h-12 w-12 text-muted-foreground" />
            </div>
            <CardTitle>A/B Testing disponible en el plan Growth</CardTitle>
            <CardDescription>
              Actualiza tu plan para acceder a A/B testing automatizado.
            </CardDescription>
            <div className="mt-6">
              <Button onClick={() => router.push('/pricing')}>Ver planes</Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Card>
          <CardHeader className="text-center py-12">
            <CardTitle>Campaña no encontrada</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If there is an existing test, show it
  if (existingTest) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FlaskConical className="h-8 w-8" />
              {existingTest.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Campaña: {campaign.name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {existingTest.status === 'draft' && (
              <Button onClick={handleLaunch} disabled={launching}>
                {launching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4 mr-2" />
                )}
                Lanzar test
              </Button>
            )}

            {existingTest.status === 'running' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleToggleStatus('paused')}
                  disabled={actionLoading}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </Button>
              </>
            )}

            {existingTest.status === 'paused' && (
              <Button
                onClick={() => handleToggleStatus('running')}
                disabled={actionLoading}
              >
                <Play className="h-4 w-4 mr-2" />
                Reanudar
              </Button>
            )}
          </div>
        </div>

        {/* Status and info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Estado</p>
              <Badge variant={existingTest.status === 'running' ? 'default' : 'secondary'} className="mt-1">
                {existingTest.status === 'draft' && 'Borrador'}
                {existingTest.status === 'running' && 'En ejecución'}
                {existingTest.status === 'paused' && 'Pausado'}
                {existingTest.status === 'completed' && 'Completado'}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Tipo</p>
              <p className="text-sm font-medium mt-1 capitalize">{existingTest.test_type}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Variantes</p>
              <p className="text-sm font-medium mt-1">{existingTest.variants?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Duración</p>
              <p className="text-sm font-medium mt-1">{existingTest.test_duration_days} días</p>
            </CardContent>
          </Card>
        </div>

        {/* Hypothesis */}
        {existingTest.hypothesis && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Hipótesis</p>
              <p className="text-sm">
                {existingTest.hypothesis}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Metrics table (if running or completed) */}
        {(existingTest.status === 'running' || existingTest.status === 'completed' || existingTest.status === 'paused') &&
          existingTest.variants?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comparación de variantes</CardTitle>
              </CardHeader>
              <CardContent>
                <VariantMetricsTable
                  variants={existingTest.variants}
                  successMetric={existingTest.success_metric}
                  winnerVariantId={existingTest.winner_variant_id}
                />

                {/* Manual winner declaration (for running/paused tests) */}
                {(existingTest.status === 'running' || existingTest.status === 'paused') && !existingTest.winner_variant_id && (
                  <div className="mt-6 border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Declarar ganador manualmente (se pausarán las demás variantes):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {existingTest.variants.map((variant, index) => (
                        <Button
                          key={variant.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeclareWinner(variant.id)}
                          disabled={actionLoading}
                        >
                          <Trophy className="h-3 w-3 mr-1" />
                          {String.fromCharCode(65 + index)}: {variant.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        {/* Variant previews */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Variantes del test</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(existingTest.variants || []).map((variant, index) => (
              <VariantPreview
                key={variant.id}
                variant={variant}
                index={index}
                isWinner={existingTest.winner_variant_id === variant.id}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Create new test form
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FlaskConical className="h-8 w-8" />
          Nuevo A/B Test
        </h1>
        <p className="text-muted-foreground mt-1">
          Campaña: {campaign.name}
        </p>
      </div>

      {/* Step 1: Test name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Nombre del test</CardTitle>
          <CardDescription>
            Dale un nombre descriptivo a tu prueba A/B.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Ej: Test de copy - Ángulo emocional vs racional"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            className="max-w-lg"
          />
        </CardContent>
      </Card>

      {/* Step 2: Test type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Tipo de test</CardTitle>
          <CardDescription>
            Selecciona qué elemento quieres probar. La IA generará las variantes automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TestTypeSelector
            selected={testType}
            onSelect={(type) => setTestType(type)}
          />
        </CardContent>
      </Card>

      {/* Step 3: Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3. Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Métrica de éxito</label>
              <Select value={successMetric} onValueChange={setSuccessMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ctr">CTR (Tasa de clics)</SelectItem>
                  <SelectItem value="cpa">CPA (Costo por acción)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Duración (días)</label>
              <Select value={durationDays} onValueChange={setDurationDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 días</SelectItem>
                  <SelectItem value="14">14 días</SelectItem>
                  <SelectItem value="21">21 días</SelectItem>
                  <SelectItem value="30">30 días</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleCreate}
          disabled={!testType || !testName.trim() || creating}
        >
          {creating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FlaskConical className="h-4 w-4 mr-2" />
          )}
          Crear A/B Test con IA
        </Button>
      </div>
    </div>
  );
}
