'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';

const plans = [
  {
    key: 'free',
    name: 'Gratis',
    description: 'Perfecto para empezar',
    monthly: 0,
    annual: 0,
    features: [
      '1 campaña activa',
      '5 generaciones IA/mes',
      '1 cuenta publicitaria',
      'Dashboard básico',
      'Soporte comunidad',
    ],
    cta: 'Comenzar Gratis',
    popular: false,
  },
  {
    key: 'starter',
    name: 'Starter',
    description: 'Para negocios en crecimiento',
    monthly: 29,
    annual: 23,
    features: [
      '3 campañas activas',
      '50 generaciones IA/mes',
      '2 cuentas publicitarias',
      'Creación masiva',
      '5 reglas de automatización',
      'Soporte por email',
    ],
    cta: 'Elegir Starter',
    popular: false,
  },
  {
    key: 'growth',
    name: 'Growth',
    description: 'Para equipos de marketing',
    monthly: 79,
    annual: 63,
    features: [
      '15 campañas activas',
      'Generaciones IA ilimitadas',
      '5 cuentas publicitarias',
      'Reportes PDF con IA',
      'Optimizador automático',
      'Analíticas avanzadas',
      'Soporte prioritario',
    ],
    cta: 'Elegir Growth',
    popular: true,
  },
  {
    key: 'agency',
    name: 'Agencia',
    description: 'Para agencias de publicidad',
    monthly: 199,
    annual: 159,
    features: [
      'Campañas ilimitadas',
      'Sin límite de inversión',
      'Cuentas ilimitadas',
      'IA ilimitada',
      'Reportes PDF con IA',
      'Optimizador automático',
      'Soporte dedicado + onboarding',
    ],
    cta: 'Elegir Agencia',
    popular: false,
  },
];

const comparisonFeatures = [
  { name: 'Campañas activas', free: '1', starter: '3', growth: '15', agency: 'Ilimitadas' },
  { name: 'Generaciones IA/mes', free: '5', starter: '50', growth: 'Ilimitadas', agency: 'Ilimitadas' },
  { name: 'Cuentas publicitarias', free: '1', starter: '2', growth: '5', agency: 'Ilimitadas' },
  { name: 'Dashboard de métricas', free: 'Básico', starter: 'Básico', growth: 'Avanzado', agency: 'Avanzado' },
  { name: 'Creación masiva', free: '—', starter: '✓', growth: '✓', agency: '✓' },
  { name: 'Reglas de automatización', free: '—', starter: '5', growth: '25', agency: 'Ilimitadas' },
  { name: 'Reportes PDF', free: '—', starter: '—', growth: '✓', agency: '✓' },
  { name: 'Análisis IA de reportes', free: '—', starter: '—', growth: '✓', agency: '✓' },
  { name: 'Optimizador automático', free: '—', starter: '—', growth: '✓', agency: '✓' },
  { name: 'Soporte', free: 'Comunidad', starter: 'Email', growth: 'Prioritario', agency: 'Dedicado' },
];

const faqs = [
  {
    question: '¿Puedo cambiar de plan en cualquier momento?',
    answer: 'Sí, puedes mejorar o cambiar tu plan en cualquier momento. Al mejorar, solo pagarás la diferencia proporcional. Si bajas de plan, el cambio se aplica al final del período de facturación.',
  },
  {
    question: '¿Qué métodos de pago aceptan?',
    answer: 'Aceptamos todas las tarjetas de crédito y débito principales (Visa, Mastercard, American Express). Los pagos se procesan de forma segura a través de Stripe.',
  },
  {
    question: '¿Hay un período de prueba?',
    answer: 'El plan Gratis es permanente y no requiere tarjeta de crédito. Puedes usarlo todo el tiempo que necesites antes de decidir mejorar.',
  },
  {
    question: '¿Qué pasa si supero mis límites?',
    answer: 'Te notificaremos cuando estés cerca de tus límites. Si los alcanzas, podrás seguir usando la plataforma pero algunas funciones estarán bloqueadas hasta que mejores tu plan o comience un nuevo mes.',
  },
  {
    question: '¿Puedo cancelar mi suscripción?',
    answer: 'Sí, puedes cancelar en cualquier momento desde la configuración de facturación. Tu plan se mantendrá activo hasta el final del período de facturación.',
  },
  {
    question: '¿Ofrecen descuentos para pago anual?',
    answer: 'Sí, ofrecemos un 20% de descuento en todos los planes cuando eliges facturación anual.',
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { user } = useUser();
  const router = useRouter();

  const handleSelectPlan = async (planKey: string) => {
    if (planKey === 'free') {
      router.push('/register');
      return;
    }

    if (!user) {
      router.push(`/register?redirect=/pricing&plan=${planKey}`);
      return;
    }

    setLoading(planKey);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey,
          interval: annual ? 'annual' : 'monthly',
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Error al crear sesión de pago');
      }
    } catch {
      toast.error('Error al conectar con el servidor');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">MetaAds Autopilot</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Iniciar Sesión</Button>
                </Link>
                <Link href="/register">
                  <Button>Empezar Gratis</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Pricing Header */}
      <section className="container mx-auto px-4 pt-16 pb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Planes para cada etapa de tu negocio
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Empieza gratis y escala cuando estés listo. Sin compromisos.
        </p>

        {/* Annual toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm ${!annual ? 'font-medium' : 'text-muted-foreground'}`}>
            Mensual
          </span>
          <Switch checked={annual} onCheckedChange={setAnnual} />
          <span className={`text-sm ${annual ? 'font-medium' : 'text-muted-foreground'}`}>
            Anual
          </span>
          {annual && (
            <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600 border-green-500/20">
              20% descuento
            </Badge>
          )}
        </div>
      </section>

      {/* Plan Cards */}
      <section className="container mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.key}
              className={plan.popular ? 'border-primary shadow-lg relative' : ''}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>Más Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    ${annual ? plan.annual : plan.monthly}
                  </span>
                  <span className="text-muted-foreground">/mes</span>
                  {annual && plan.monthly > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="line-through">${plan.monthly}/mes</span>
                      {' '}facturado anualmente
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  disabled={loading === plan.key}
                  onClick={() => handleSelectPlan(plan.key)}
                >
                  {loading === plan.key ? 'Procesando...' : plan.cta}
                  {plan.key !== 'free' && !loading && (
                    <ArrowRight className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="container mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">
          Comparación detallada
        </h2>
        <div className="max-w-5xl mx-auto overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Función</TableHead>
                <TableHead className="text-center">Gratis</TableHead>
                <TableHead className="text-center">Starter</TableHead>
                <TableHead className="text-center font-bold">Growth</TableHead>
                <TableHead className="text-center">Agencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonFeatures.map((feature) => (
                <TableRow key={feature.name}>
                  <TableCell className="font-medium">{feature.name}</TableCell>
                  <TableCell className="text-center">{feature.free}</TableCell>
                  <TableCell className="text-center">{feature.starter}</TableCell>
                  <TableCell className="text-center font-medium">{feature.growth}</TableCell>
                  <TableCell className="text-center">{feature.agency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">
          Preguntas frecuentes
        </h2>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>&copy; 2026 MetaAds Autopilot. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
