import Link from 'next/link';
import Image from 'next/image';
import {
  Zap,
  Brain,
  Target,
  BarChart3,
  Rocket,
  Shield,
  ArrowRight,
  Check,
  Star,
  Link2,
  MousePointerClick,
  BookOpen,
  Sparkles,
  ImagePlus,
  Layers,
  FlaskConical,
  Clock,
  TrendingUp,
  RefreshCw,
  GitBranch,
  FileText,
  Users,
  Bell,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MobileNav } from '@/components/layout/mobile-nav';

/* ──────────────────── DATA ──────────────────── */

const featureBlockA = {
  title: 'Crea con Inteligencia Artificial',
  icon: Sparkles,
  subtitle: 'Genera campañas, copy, audiencias e imágenes con IA de última generación.',
  features: [
    { icon: Zap, title: 'Campaign Express', description: 'Genera campañas completas con un clic' },
    { icon: Brain, title: 'AI Campaign Builder', description: 'Chat conversacional que diseña tu campaña paso a paso' },
    { icon: Sparkles, title: 'Generador de Copy', description: 'Textos publicitarios optimizados por IA' },
    { icon: ImagePlus, title: 'Imágenes con IA', description: 'Genera imágenes para tus anuncios sin diseñador' },
    { icon: Layers, title: 'Creación Masiva', description: 'Crea 10, 50 o 100 campañas simultáneamente' },
  ],
};

const featureBlockB = {
  title: 'Optimiza en Piloto Automático',
  icon: RefreshCw,
  subtitle: 'Reglas, tests y scheduling que trabajan 24/7 para maximizar tu ROI.',
  features: [
    { icon: MousePointerClick, title: 'Reglas de Automatización', description: 'Pausa, escala y ajusta campañas automáticamente' },
    { icon: FlaskConical, title: 'Pruebas A/B', description: 'Crea tests automáticos y encuentra la variante ganadora' },
    { icon: Clock, title: 'Smart Scheduling', description: 'Programa anuncios en los horarios de mayor rendimiento' },
    { icon: TrendingUp, title: 'Scaling Inteligente', description: 'Escala presupuestos con seguridad y control' },
    { icon: RefreshCw, title: 'Retargeting', description: 'Audiencias de retargeting y lookalike automáticas' },
    { icon: GitBranch, title: 'Funnel Builder', description: 'Embudos TOFU → MOFU → BOFU con IA' },
  ],
};

const featureBlockC = {
  title: 'Analiza y Reporta',
  icon: BarChart3,
  subtitle: 'Dashboards, reportes PDF e inteligencia de trafficker para tomar mejores decisiones.',
  features: [
    { icon: BarChart3, title: 'Dashboard en Tiempo Real', description: 'KPIs, gráficos interactivos y sparklines' },
    { icon: Brain, title: 'Trafficker IA', description: 'Análisis profundo de salud de campañas' },
    { icon: FileText, title: 'Reportes PDF', description: 'Reportes profesionales con análisis de IA' },
    { icon: Users, title: 'Métricas por Audiencia', description: 'Breakdowns por edad, género, placement y dispositivo' },
    { icon: Bell, title: 'Notificaciones Inteligentes', description: 'Alertas cuando tus campañas necesitan atención' },
  ],
};

const steps = [
  {
    number: '1',
    icon: Link2,
    title: 'Conecta',
    description: 'Vincula tu cuenta de Meta en 1 clic con OAuth seguro.',
  },
  {
    number: '2',
    icon: MessageSquare,
    title: 'Describe',
    description: 'Dile a la IA qué quieres lograr con tu campaña.',
  },
  {
    number: '3',
    icon: Sparkles,
    title: 'Genera',
    description: 'La IA crea audiencia, copy, presupuesto y anuncios.',
  },
  {
    number: '4',
    icon: TrendingUp,
    title: 'Optimiza',
    description: 'Reglas automáticas, A/B tests y scaling optimizan 24/7.',
  },
];

const plans = [
  {
    name: 'Gratis',
    price: '$0',
    period: '/mes',
    description: 'Perfecto para empezar',
    features: [
      '1 campaña activa',
      '5 generaciones IA/mes',
      'Dashboard básico',
      'Campaign Express',
      'Soporte comunidad',
    ],
    cta: 'Comenzar Gratis',
    popular: false,
    href: '/register',
  },
  {
    name: 'Starter',
    price: '$29',
    period: '/mes',
    description: 'Para negocios en crecimiento',
    features: [
      '3 campañas activas',
      '50 generaciones IA/mes',
      'Creación masiva',
      '5 reglas de automatización',
      'Soporte por email',
    ],
    cta: 'Elegir Starter',
    popular: false,
    href: '/pricing',
  },
  {
    name: 'Growth',
    price: '$79',
    period: '/mes',
    description: 'Para equipos de marketing',
    features: [
      '15 campañas activas',
      'IA ilimitada',
      'A/B testing y funnels',
      'Retargeting y scaling',
      'Smart scheduling',
      'Reportes PDF con IA',
      'Soporte prioritario',
    ],
    cta: 'Elegir Growth',
    popular: true,
    href: '/pricing',
  },
  {
    name: 'Agencia',
    price: '$199',
    period: '/mes',
    description: 'Para agencias de publicidad',
    features: [
      'Todo ilimitado',
      'Cuentas publicitarias ilimitadas',
      'IA ilimitada',
      'Soporte dedicado + onboarding',
    ],
    cta: 'Elegir Agencia',
    popular: false,
    href: '/pricing',
  },
];

const testimonials = [
  {
    name: 'María G.',
    role: 'CEO, TechStartup MX',
    initials: 'MG',
    color: 'bg-rose-500',
    content:
      'Con Campaign Express creé mi primera campaña en 2 minutos. Antes me tomaba medio día configurar todo en Meta. Redujimos el costo por lead un 45%.',
    rating: 5,
  },
  {
    name: 'Carlos R.',
    role: 'Director de Marketing, E-Shop',
    initials: 'CR',
    color: 'bg-blue-500',
    content:
      'Las reglas de automatización me ahorraron horas semanales. La plataforma pausa campañas caras y escala las ganadoras sola. Increíble.',
    rating: 5,
  },
  {
    name: 'Ana M.',
    role: 'Freelancer Digital',
    initials: 'AM',
    color: 'bg-emerald-500',
    content:
      'Como freelancer gestiono 8 clientes desde un solo lugar. Los funnels y reportes PDF me hacen ver profesional ante cada cliente.',
    rating: 5,
  },
];

const socialProofStats = [
  { value: '500+', label: 'campañas creadas' },
  { value: '12+', label: 'países' },
  { value: '24/7', label: 'optimización automática' },
  { value: '60+', label: 'funciones con IA' },
];

/* ──────────────── COMPONENT HELPERS ──────────────── */

function FeatureBlock({
  block,
}: {
  block: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    subtitle: string;
    features: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }[];
  };
}) {
  const Icon = block.icon;
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold">{block.title}</h3>
          <p className="text-sm text-muted-foreground">{block.subtitle}</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {block.features.map((f) => {
          const FIcon = f.icon;
          return (
            <Card key={f.title} className="border bg-card">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <FIcon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{f.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────── PAGE ──────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Zap className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">MetaAds Autopilot</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Funciones
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Precios
            </a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
              Testimonios
            </a>
            <Link
              href="/campaigns/new?express=true"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              Campaign Express
              <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-600 border-amber-500/30">
                Nuevo
              </Badge>
            </Link>
            <Link href="/guia" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              Guía
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link href="/register" className="hidden sm:inline-flex">
              <Button>Empezar Gratis</Button>
            </Link>
            <MobileNav />
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative min-h-[600px] md:min-h-[700px] flex items-center justify-center overflow-hidden">
        <Image
          src="/images/hero-bg.webp"
          alt=""
          fill
          priority
          loading="eager"
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90 md:from-black/70 md:via-black/50 md:to-black/80" />

        <div className="relative z-10 container mx-auto px-4 py-20 md:py-32 text-center">
          <Badge className="mb-6 bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30">
            Nuevo: Campaign Express — genera en 1 clic
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto text-white">
            Crea, optimiza y escala tus campañas de{' '}
            <span className="text-amber-400">Meta Ads</span>{' '}
            en piloto automático
          </h1>
          <p className="text-lg md:text-xl text-white/75 mt-6 max-w-2xl mx-auto">
            La IA genera campañas completas con un clic, las reglas automáticas optimizan 24/7,
            y los reportes te muestran exactamente qué funciona.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link href="/register">
              <Button size="lg" className="gap-2 text-lg px-8 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                Crear Mi Primera Campaña <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8 border-white/30 text-white hover:bg-white/10">
                Ver Funciones
              </Button>
            </a>
          </div>
          <p className="text-sm text-white/50 mt-4">
            Sin tarjeta de crédito · Configura en 2 minutos
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ─── Social Proof Bar ─── */}
      <section className="border-b bg-muted/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {socialProofStats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 text-sm">
                <span className="font-bold text-lg">{stat.value}</span>
                <span className="text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Campaign Express Highlight ─── */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/40 dark:via-orange-950/40 dark:to-yellow-950/40 border p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              {/* Left: text */}
              <div className="space-y-6">
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-800">
                  Feature Estrella
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold">
                  Campaña completa en 1 clic
                </h2>
                <p className="text-muted-foreground text-lg">
                  Describe tu objetivo y la IA genera automáticamente: estrategia, audiencias, copy,
                  presupuesto y anuncios. Lista para publicar.
                </p>
                <div className="grid grid-cols-3 gap-4 pt-2">
                  {[
                    { icon: MessageSquare, label: 'Describe' },
                    { icon: Sparkles, label: 'IA genera' },
                    { icon: Rocket, label: 'Publica' },
                  ].map((s, i) => (
                    <div key={s.label} className="flex flex-col items-center gap-2 text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <s.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="text-sm font-medium">{s.label}</span>
                      {i < 2 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block absolute" style={{ display: 'none' }} />
                      )}
                    </div>
                  ))}
                </div>
                <Link href="/register">
                  <Button size="lg" className="gap-2 mt-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                    Probar Campaign Express <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>

              {/* Right: mockup visual */}
              <div className="space-y-4">
                <Card className="border shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">Campaign Express</Badge>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-medium">Lista</span>
                      </div>
                    </div>
                    <CardTitle className="text-base mt-2">Campaña Black Friday — E-commerce</CardTitle>
                    <CardDescription>Objetivo: Conversiones · Duración: 7 días</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Presupuesto</span>
                      <span className="font-medium">$50/día</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Audiencias</span>
                      <span className="font-medium">3 segmentos</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Anuncios</span>
                      <span className="font-medium">6 variantes</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-muted-foreground">Score de confianza</span>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">92/100</Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-amber-200 to-orange-300 dark:from-amber-800 dark:to-orange-900 flex items-center justify-center shrink-0">
                        <ImagePlus className="h-6 w-6 text-amber-700 dark:text-amber-300" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-medium truncate">🔥 Ofertas Black Friday</p>
                        <p className="text-xs text-muted-foreground">Hasta 50% de descuento en toda la tienda. Solo este fin de semana.</p>
                        <p className="text-xs text-primary font-medium">Comprar Ahora →</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features — 3 Blocks ─── */}
      <section id="features" className="container mx-auto px-4 py-20 border-t">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Todo lo que necesitas para dominar Meta Ads
        </h2>
        <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
          Más de 60 funciones diseñadas para maximizar cada peso de tu inversión publicitaria.
        </p>
        <div className="max-w-6xl mx-auto space-y-20">
          <FeatureBlock block={featureBlockA} />
          <FeatureBlock block={featureBlockB} />
          <FeatureBlock block={featureBlockC} />
        </div>
      </section>

      {/* ─── Cómo Funciona — 4 steps ─── */}
      <section className="container mx-auto px-4 py-20 border-t">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Cómo funciona
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          De cero a campaña optimizada en minutos, no en días.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {steps.map((step) => (
            <div key={step.number} className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <step.icon className="h-8 w-8 text-primary" />
              </div>
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="container mx-auto px-4 py-20 border-t">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Planes para cada etapa de tu negocio
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          Empieza gratis y escala cuando estés listo. Sin compromisos.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
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
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
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
                <Link href={plan.href} className="w-full">
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="testimonials" className="container mx-auto px-4 py-20 border-t">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Lo que dicen nuestros clientes
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          Negocios como el tuyo ya están maximizando sus resultados.
        </p>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t) => (
            <Card key={t.name}>
              <CardHeader>
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm italic">&ldquo;{t.content}&rdquo;</p>
              </CardHeader>
              <CardFooter>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-white text-sm font-bold`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Guide Section ─── */}
      <section className="container mx-auto px-4 py-20 border-t">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <BookOpen className="h-10 w-10 text-white" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <Badge className="mb-3 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800">
                  Guía Gratuita
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  ¿No tienes cuenta de Meta Ads?
                </h2>
                <p className="text-muted-foreground mb-6">
                  Te guiamos paso a paso para crear tu página de Facebook, configurar tu cuenta
                  publicitaria, instalar el Pixel y empezar a hacer publicidad. Sin experiencia previa.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Link href="/guia">
                    <Button size="lg" className="gap-2">
                      Te guiamos paso a paso <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-3 md:grid-cols-6 gap-4 text-center text-xs text-muted-foreground">
              {[
                { step: '1', label: 'Crear Página' },
                { step: '2', label: 'Cuenta Publicitaria' },
                { step: '3', label: 'Pixel (Opcional)' },
                { step: '4', label: 'Verificar Negocio' },
                { step: '5', label: 'Conectar App' },
                { step: '6', label: 'Primera Campaña' },
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {s.step}
                  </div>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Final ─── */}
      <section className="container mx-auto px-4 py-20 border-t">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            Crea tu primera campaña en 2 minutos
          </h2>
          <p className="text-lg text-muted-foreground">
            Sin tarjeta de crédito. Cancela cuando quieras.
          </p>
          <Link href="/register">
            <Button size="lg" className="gap-2 text-lg px-8 mt-2">
              Empezar Gratis <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-6 w-6 text-primary" />
                <span className="font-bold">MetaAds Autopilot</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatización inteligente de campañas publicitarias en Meta Ads.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Producto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">Funciones</a></li>
                <li>
                  <Link href="/campaigns/new?express=true" className="hover:text-foreground">
                    Campaign Express
                  </Link>
                </li>
                <li><a href="#pricing" className="hover:text-foreground">Precios</a></li>
                <li><Link href="/guia" className="hover:text-foreground">Guía de inicio</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Recursos</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#testimonials" className="hover:text-foreground">Testimonios</a></li>
                <li><Link href="/terms" className="hover:text-foreground">Términos</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground">Privacidad</Link></li>
                <li><Link href="/terms" className="hover:text-foreground">Términos</Link></li>
                <li><a href="#pricing" className="hover:text-foreground">Precios</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 MetaAds Autopilot. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
