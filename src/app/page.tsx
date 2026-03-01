import Link from 'next/link';
import Image from 'next/image';
import {
  Zap,
  BarChart3,
  Target,
  Brain,
  Rocket,
  Shield,
  ArrowRight,
  Check,
  Star,
  Link2,
  MousePointerClick,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const features = [
  {
    icon: Brain,
    title: 'IA que Optimiza',
    description: 'Nuestra IA analiza el rendimiento de tus campañas y sugiere mejoras automáticamente para maximizar tu ROI.',
  },
  {
    icon: Target,
    title: 'Segmentación Inteligente',
    description: 'Encuentra tu audiencia ideal con segmentación avanzada basada en datos reales de comportamiento.',
  },
  {
    icon: BarChart3,
    title: 'Analíticas en Tiempo Real',
    description: 'Dashboard completo con métricas clave, gráficos interactivos y reportes automatizados.',
  },
  {
    icon: Rocket,
    title: 'Creación Rápida',
    description: 'Crea campañas completas en minutos con plantillas optimizadas y asistencia de IA.',
  },
  {
    icon: Shield,
    title: 'Presupuesto Protegido',
    description: 'Alertas inteligentes y límites automáticos para que nunca gastes más de lo planeado.',
  },
  {
    icon: MousePointerClick,
    title: 'Automatización Total',
    description: 'Reglas automáticas que pausan, activan y ajustan tus campañas sin intervención manual.',
  },
];

const steps = [
  {
    number: '1',
    icon: Link2,
    title: 'Conecta tu Cuenta',
    description: 'Vincula tu cuenta de Meta Business en un clic. Acceso seguro con OAuth.',
  },
  {
    number: '2',
    icon: Rocket,
    title: 'Configura tu Campaña',
    description: 'Nuestra IA te guía para crear campañas optimizadas según tu industria y objetivos.',
  },
  {
    number: '3',
    icon: BarChart3,
    title: 'Mide y Escala',
    description: 'Monitorea resultados en tiempo real y deja que la IA optimice automáticamente.',
  },
];

const plans = [
  {
    name: 'Gratis',
    price: '$0',
    period: '/mes',
    description: 'Perfecto para empezar',
    features: ['1 campaña activa', '5 generaciones IA/mes', '1 cuenta publicitaria', 'Dashboard básico', 'Soporte comunidad'],
    cta: 'Comenzar Gratis',
    popular: false,
    href: '/register',
  },
  {
    name: 'Starter',
    price: '$29',
    period: '/mes',
    description: 'Para negocios en crecimiento',
    features: ['3 campañas activas', '50 generaciones IA/mes', '2 cuentas publicitarias', 'Creación masiva', 'Soporte por email'],
    cta: 'Elegir Starter',
    popular: false,
    href: '/pricing',
  },
  {
    name: 'Growth',
    price: '$79',
    period: '/mes',
    description: 'Para equipos de marketing',
    features: ['15 campañas activas', 'IA ilimitada', 'Reportes PDF con IA', 'Optimizador automático', 'Soporte prioritario'],
    cta: 'Elegir Growth',
    popular: true,
    href: '/pricing',
  },
  {
    name: 'Agencia',
    price: '$199',
    period: '/mes',
    description: 'Para agencias de publicidad',
    features: ['Campañas ilimitadas', 'Sin límite de inversión', 'Cuentas ilimitadas', 'IA ilimitada', 'Soporte dedicado + onboarding'],
    cta: 'Elegir Agencia',
    popular: false,
    href: '/pricing',
  },
];

const testimonials = [
  {
    name: 'María García',
    role: 'CEO, TechStartup MX',
    content: 'Redujimos nuestro costo por lead un 45% en el primer mes. La IA realmente entiende cómo optimizar las campañas.',
    rating: 5,
  },
  {
    name: 'Carlos Rodríguez',
    role: 'Director de Marketing, E-Shop',
    content: 'Antes pasaba horas ajustando campañas. Ahora la plataforma lo hace automáticamente y con mejores resultados.',
    rating: 5,
  },
  {
    name: 'Ana Martínez',
    role: 'Freelancer Digital',
    content: 'Como freelancer, esta herramienta me permite gestionar las campañas de todos mis clientes desde un solo lugar.',
    rating: 5,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Zap className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">MetaAds Autopilot</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Funciones</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Precios</a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Testimonios</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link href="/register">
              <Button>Empezar Gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[600px] md:min-h-[700px] flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <Image
          src="/images/hero-bg.webp"
          alt=""
          fill
          priority
          loading="eager"
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Overlay — darker on mobile for legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90 md:from-black/70 md:via-black/50 md:to-black/80" />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-20 md:py-32 text-center">
          <Badge className="mb-6 bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30">
            Potenciado por Inteligencia Artificial
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto text-white">
            Automatiza tus campañas de{' '}
            <span className="text-amber-400">Meta Ads</span>{' '}
            con IA
          </h1>
          <p className="text-lg md:text-xl text-white/75 mt-6 max-w-2xl mx-auto">
            Crea, gestiona y optimiza tus campañas de Facebook e Instagram Ads de forma
            inteligente. Maximiza tu ROI mientras ahorras tiempo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link href="/register">
              <Button size="lg" className="gap-2 text-lg px-8 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                Comenzar Gratis <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8 border-white/30 text-white hover:bg-white/10">
                Ver Funciones
              </Button>
            </a>
          </div>
          <p className="text-sm text-white/50 mt-4">
            Sin tarjeta de crédito. Configura en menos de 5 minutos.
          </p>
        </div>

        {/* Bottom fade to page background */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* 3 Steps */}
      <section className="container mx-auto px-4 py-20 border-t">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Tan fácil como 1, 2, 3
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          Comienza a optimizar tus campañas en minutos, no en días.
        </p>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step) => (
            <div key={step.number} className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <step.icon className="h-8 w-8 text-primary" />
              </div>
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20 border-t">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Todo lo que necesitas para dominar Meta Ads
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          Herramientas poderosas diseñadas para maximizar cada peso de tu inversión publicitaria.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature) => (
            <Card key={feature.title} className="border bg-card">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
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

      {/* Testimonials */}
      <section id="testimonials" className="container mx-auto px-4 py-20 border-t">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Lo que dicen nuestros clientes
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          Negocios como el tuyo ya están maximizando sus resultados.
        </p>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name}>
              <CardHeader>
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm italic">&ldquo;{testimonial.content}&rdquo;</p>
              </CardHeader>
              <CardFooter>
                <div>
                  <p className="font-medium text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 border-t">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">
            ¿Listo para automatizar tus campañas?
          </h2>
          <p className="text-lg text-muted-foreground">
            Únete a cientos de negocios que ya están ahorrando tiempo y dinero
            con MetaAds Autopilot.
          </p>
          <Link href="/register">
            <Button size="lg" className="gap-2 text-lg px-8">
              Comenzar Gratis <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
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
                <li><a href="#pricing" className="hover:text-foreground">Precios</a></li>
                <li><a href="#" className="hover:text-foreground">Integraciones</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Recursos</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Documentación</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Soporte</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacidad</a></li>
                <li><a href="#" className="hover:text-foreground">Términos</a></li>
                <li><a href="#" className="hover:text-foreground">Cookies</a></li>
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
