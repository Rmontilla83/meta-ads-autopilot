'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CreditCard, ExternalLink, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionInfo {
  plan: string;
  planName: string;
  price: { monthly: number; annual: number };
  subscription: {
    status: string;
    billing_interval: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  } | null;
  usage: {
    ai_generations: number;
    image_generations: number;
    active_campaigns: number;
    reports_generated: number;
  };
  limits: {
    activeCampaigns: number;
    aiGenerations: number;
    imageGenerations: number;
    pdfReports: boolean;
  };
}

export default function BillingPage() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    // Show success toast if redirected from Stripe checkout
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success('Pago procesado exitosamente. Tu plan se actualizará en unos momentos.');
      // Clean URL
      window.history.replaceState({}, '', '/settings/billing');
    }

    fetch('/api/subscription')
      .then(r => r.json())
      .then(data => setInfo(data))
      .catch(() => toast.error('Error al cargar información'))
      .finally(() => setLoading(false));
  }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Error al abrir portal');
      }
    } catch {
      toast.error('Error al conectar');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Facturación</h1>
          <p className="text-muted-foreground mt-1">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  const isFree = info.plan === 'free';
  const usagePercent = (val: number, limit: number) =>
    limit === -1 ? 0 : Math.min(Math.round((val / limit) * 100), 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Facturación</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tu plan y método de pago.
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Plan {info.planName}
                {!isFree && (
                  <Badge variant="default">
                    {info.subscription?.billing_interval === 'annual' ? 'Anual' : 'Mensual'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isFree
                  ? 'Plan gratuito con funciones limitadas'
                  : `$${info.subscription?.billing_interval === 'annual' ? info.price.annual : info.price.monthly}/mes`}
              </CardDescription>
            </div>
            {!isFree && (
              <Badge variant={info.subscription?.status === 'active' ? 'default' : 'destructive'}>
                {info.subscription?.status === 'active' ? 'Activo' : info.subscription?.status === 'past_due' ? 'Pago pendiente' : 'Cancelado'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {info.subscription?.current_period_end && (
            <p className="text-sm text-muted-foreground">
              {info.subscription.cancel_at_period_end
                ? 'Se cancelará el '
                : 'Próxima facturación: '}
              {new Date(info.subscription.current_period_end).toLocaleDateString('es-MX', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex gap-3">
          <Link href="/pricing">
            <Button variant={isFree ? 'default' : 'outline'}>
              {isFree ? (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Mejorar plan
                </>
              ) : (
                'Cambiar plan'
              )}
            </Button>
          </Link>
          {!isFree && (
            <Button variant="outline" disabled={portalLoading} onClick={openPortal}>
              <CreditCard className="h-4 w-4 mr-2" />
              {portalLoading ? 'Abriendo...' : 'Gestionar suscripción'}
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Uso del mes actual</CardTitle>
          <CardDescription>Tu consumo en el período de facturación actual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Generations */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Generaciones IA</span>
              <span className="text-muted-foreground">
                {info.usage.ai_generations}
                {info.limits.aiGenerations === -1 ? ' / Ilimitadas' : ` / ${info.limits.aiGenerations}`}
              </span>
            </div>
            {info.limits.aiGenerations !== -1 && (
              <Progress value={usagePercent(info.usage.ai_generations, info.limits.aiGenerations)} />
            )}
          </div>

          {/* Image Generations */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Imágenes generadas</span>
              <span className="text-muted-foreground">
                {info.usage.image_generations}
                {info.limits.imageGenerations === -1 ? ' / Ilimitadas' : ` / ${info.limits.imageGenerations}`}
              </span>
            </div>
            {info.limits.imageGenerations !== -1 && (
              <Progress value={usagePercent(info.usage.image_generations, info.limits.imageGenerations)} />
            )}
          </div>

          {/* Active Campaigns */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Campañas activas</span>
              <span className="text-muted-foreground">
                {info.usage.active_campaigns}
                {info.limits.activeCampaigns === -1 ? ' / Ilimitadas' : ` / ${info.limits.activeCampaigns}`}
              </span>
            </div>
            {info.limits.activeCampaigns !== -1 && (
              <Progress value={usagePercent(info.usage.active_campaigns, info.limits.activeCampaigns)} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Free plan upgrade CTA */}
      {isFree && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Desbloquea todo el potencial
            </CardTitle>
            <CardDescription>
              Mejora a un plan de pago para acceder a reportes PDF, automatización avanzada, generaciones IA ilimitadas y más.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/pricing">
              <Button>
                Ver planes <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
