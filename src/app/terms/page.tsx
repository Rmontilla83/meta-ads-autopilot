import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Términos de Servicio - MetaAds Autopilot',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al inicio
        </Link>
      </Button>

      <h1 className="text-3xl font-bold mb-2">Términos de Servicio</h1>
      <p className="text-muted-foreground mb-8">Última actualización: 1 de marzo de 2026</p>

      <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">1. Aceptación de los términos</h2>
          <p className="text-muted-foreground leading-relaxed">
            Al acceder y utilizar MetaAds Autopilot, aceptas estos términos de servicio en su totalidad.
            Si no estás de acuerdo con alguno de estos términos, no debes utilizar el servicio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">2. Descripción del servicio</h2>
          <p className="text-muted-foreground leading-relaxed">
            MetaAds Autopilot es una plataforma de gestión de campañas publicitarias de Meta
            que utiliza inteligencia artificial para ayudarte a crear, gestionar y optimizar
            tus anuncios. El servicio incluye:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Creación de campañas asistida por IA.</li>
            <li>Publicación y gestión de campañas en Meta Ads.</li>
            <li>Análisis de métricas y rendimiento.</li>
            <li>Reglas de automatización para optimización.</li>
            <li>Generación de reportes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">3. Cuenta de usuario</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Eres responsable de mantener la seguridad de tu cuenta y contraseña.</li>
            <li>Debes proporcionar información veraz y actualizada.</li>
            <li>No debes compartir tu cuenta con terceros.</li>
            <li>Eres responsable de todas las actividades que ocurran bajo tu cuenta.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">4. Conexión con Meta</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para utilizar las funciones de gestión de campañas, necesitas conectar tu cuenta
            de Meta Business. Al hacerlo, nos autorizas a:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Acceder a tus cuentas publicitarias y páginas.</li>
            <li>Crear, editar y gestionar campañas publicitarias en tu nombre.</li>
            <li>Leer métricas de rendimiento de tus campañas.</li>
            <li>Puedes revocar este acceso en cualquier momento desde la configuración.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">5. Planes y pagos</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>El plan gratuito incluye funcionalidades limitadas.</li>
            <li>Los planes de pago se facturan mensual o anualmente a través de Stripe.</li>
            <li>Puedes cancelar tu suscripción en cualquier momento.</li>
            <li>No se realizan reembolsos por periodos parciales.</li>
            <li>Nos reservamos el derecho de modificar los precios con notificación previa de 30 días.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">6. Uso aceptable</h2>
          <p className="text-muted-foreground leading-relaxed">No debes:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Utilizar el servicio para actividades ilegales o que violen las políticas de Meta.</li>
            <li>Intentar acceder a datos de otros usuarios.</li>
            <li>Sobrecargar intencionalmente los servidores del servicio.</li>
            <li>Usar bots o scripts automatizados para acceder al servicio sin autorización.</li>
            <li>Revender o redistribuir el servicio sin autorización.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">7. Limitación de responsabilidad</h2>
          <p className="text-muted-foreground leading-relaxed">
            MetaAds Autopilot se proporciona &quot;tal cual&quot;. No garantizamos resultados específicos
            en tus campañas publicitarias. No somos responsables de:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Pérdidas económicas derivadas del rendimiento de las campañas.</li>
            <li>Interrupciones del servicio de Meta o cambios en su API.</li>
            <li>Decisiones tomadas por las reglas de automatización configuradas por el usuario.</li>
            <li>Sugerencias generadas por la inteligencia artificial.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">8. Modificaciones</h2>
          <p className="text-muted-foreground leading-relaxed">
            Nos reservamos el derecho de modificar estos términos. Te notificaremos sobre
            cambios significativos por correo electrónico o mediante un aviso en la plataforma.
          </p>
        </section>
      </div>
    </div>
  );
}
