import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidad - MetaAds Autopilot',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al inicio
        </Link>
      </Button>

      <h1 className="text-3xl font-bold mb-2">Política de Privacidad</h1>
      <p className="text-muted-foreground mb-8">Última actualización: 1 de marzo de 2026</p>

      <div className="prose prose-zinc dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">1. Información que recopilamos</h2>
          <p className="text-muted-foreground leading-relaxed">
            MetaAds Autopilot recopila la siguiente información cuando utilizas nuestro servicio:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Datos de cuenta:</strong> Nombre, correo electrónico y contraseña al registrarte.</li>
            <li><strong>Datos de Meta:</strong> ID de usuario de Meta, nombre, IDs de cuentas publicitarias y páginas, obtenidos mediante autorización OAuth.</li>
            <li><strong>Métricas de campañas:</strong> Datos de rendimiento de tus campañas publicitarias (impresiones, clics, conversiones, gasto, etc.).</li>
            <li><strong>Datos de uso:</strong> Información sobre cómo interactúas con la plataforma para mejorar el servicio.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">2. Cómo usamos tu información</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Gestionar y optimizar tus campañas publicitarias de Meta.</li>
            <li>Proporcionar análisis e informes de rendimiento.</li>
            <li>Generar sugerencias de IA para mejorar tus campañas.</li>
            <li>Ejecutar reglas de automatización que hayas configurado.</li>
            <li>Procesar pagos y gestionar tu suscripción.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">3. Almacenamiento y seguridad de datos</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Los datos se almacenan en servidores seguros con Supabase (PostgreSQL).</li>
            <li>Implementamos Row Level Security (RLS) para aislar datos entre usuarios.</li>
            <li>Los tokens de acceso de Meta se cifran con AES-256 antes del almacenamiento.</li>
            <li>No almacenamos tokens ni datos sensibles en el navegador del cliente.</li>
            <li>Las comunicaciones se realizan sobre HTTPS con TLS.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">4. Compartir datos con terceros</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Google Gemini AI:</strong> Los datos de campañas se comparten de forma anonimizada (sin PII) para generar análisis y sugerencias.</li>
            <li><strong>Stripe:</strong> Recibe tu correo electrónico e información de plan para procesar pagos.</li>
            <li><strong>Meta (Facebook):</strong> Interactuamos con la API de Meta para gestionar tus campañas según tus instrucciones.</li>
            <li>No vendemos ni compartimos tus datos con ningún otro tercero.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">5. Retención de datos</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Los datos de tu cuenta se conservan mientras mantengas una cuenta activa.</li>
            <li>Las métricas de campañas se conservan para tu historial de análisis.</li>
            <li>Las notificaciones antiguas se eliminan después de 90 días.</li>
            <li>Los registros de ejecución de reglas se eliminan después de 90 días.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">6. Tus derechos</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Acceso:</strong> Puedes ver todos tus datos desde el panel de control.</li>
            <li><strong>Desconexión:</strong> Puedes desconectar tu cuenta de Meta en cualquier momento desde Configuración.</li>
            <li><strong>Eliminación:</strong> Puedes solicitar la eliminación completa de tus datos contactándonos.</li>
            <li><strong>Portabilidad:</strong> Puedes exportar tus datos de campañas mediante los reportes PDF.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">7. Eliminación de datos de Meta</h2>
          <p className="text-muted-foreground leading-relaxed">
            Proporcionamos un endpoint de eliminación de datos conforme a los requisitos de Meta.
            Cuando Meta envía una solicitud de eliminación, eliminamos todos los datos asociados
            a tu cuenta de Meta, incluyendo tokens de acceso, métricas de campañas y datos de conexión.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-8 mb-3">8. Contacto</h2>
          <p className="text-muted-foreground leading-relaxed">
            Si tienes preguntas sobre esta política de privacidad o sobre el manejo de tus datos,
            puedes contactarnos a través de la plataforma.
          </p>
        </section>
      </div>
    </div>
  );
}
