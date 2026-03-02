'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Zap,
  FileText,
  CreditCard,
  Code,
  ShieldCheck,
  Plug,
  Rocket,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  ArrowLeft,
  MessageCircle,
  PartyPopper,
  AlertTriangle,
  Info,
  LucideIcon,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FAQItem {
  question: string;
  answer: string;
}

interface ModuleData {
  id: string;
  icon: LucideIcon;
  color: string;
  colorClasses: {
    bg: string;
    bgLight: string;
    text: string;
    border: string;
    ring: string;
    badgeBg: string;
    badgeText: string;
    iconBg: string;
    sidebarActive: string;
    sidebarHover: string;
    checkAccent: string;
  };
  title: string;
  time: string;
  optional?: boolean;
  content: React.ReactNode;
  checklist: string[];
  faq: FAQItem[];
  link?: { label: string; href: string; external?: boolean };
}

/* ------------------------------------------------------------------ */
/*  Confetti CSS keyframes (injected once)                             */
/* ------------------------------------------------------------------ */

const confettiStyles = `
@keyframes confetti-fall {
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
@keyframes confetti-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-15px); }
  75% { transform: translateX(15px); }
}
@keyframes celebration-pop {
  0% { transform: scale(0.5); opacity: 0; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
`;

/* ------------------------------------------------------------------ */
/*  Module data                                                        */
/* ------------------------------------------------------------------ */

const modules: ModuleData[] = [
  {
    id: 'facebook-page',
    icon: FileText,
    color: 'blue',
    colorClasses: {
      bg: 'bg-blue-600',
      bgLight: 'bg-blue-50 dark:bg-blue-950/30',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      ring: 'ring-blue-600/20',
      badgeBg: 'bg-blue-100 dark:bg-blue-900/40',
      badgeText: 'text-blue-700 dark:text-blue-300',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      sidebarActive: 'bg-blue-50 dark:bg-blue-950/30 border-blue-600',
      sidebarHover: 'hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
      checkAccent: 'accent-blue-600',
    },
    title: 'Crea tu Pagina de Facebook',
    time: '5 min',
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed">
          Para hacer publicidad en Facebook e Instagram, necesitas una <strong className="text-foreground">Pagina de Facebook</strong> (no un perfil personal). Las paginas de negocio estan disenadas para empresas y marcas, y son el unico tipo de cuenta que puede ejecutar anuncios publicitarios.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-3">
          Tu pagina sera la identidad de tu negocio en Meta: aparecera como el anunciante en todos tus anuncios, y los usuarios podran visitarla para conocer mas sobre tu marca.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Paso a paso</h3>
        <ol className="space-y-3 text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-semibold">1</span>
            <span>Ve a <a href="https://www.facebook.com/pages/create" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-700">facebook.com/pages/create</a> e inicia sesion con tu cuenta personal de Facebook.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-semibold">2</span>
            <span>Elige la <strong className="text-foreground">categoria</strong> que mejor describe tu negocio (ej: &quot;Restaurante&quot;, &quot;Tienda de ropa&quot;, &quot;Servicio local&quot;).</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-semibold">3</span>
            <span>Sube una <strong className="text-foreground">foto de perfil</strong> (tu logo, 180x180px recomendado) y una <strong className="text-foreground">foto de portada</strong> (820x312px recomendado).</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-semibold">4</span>
            <span>Completa toda la informacion de tu negocio: descripcion, direccion, horarios, sitio web, telefono.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-semibold">5</span>
            <span>Publica al menos <strong className="text-foreground">un post</strong> para que tu pagina no se vea vacia cuando los clientes la visiten.</span>
          </li>
        </ol>
      </>
    ),
    checklist: [
      'Accedi a facebook.com/pages/create',
      'Elegi la categoria de mi pagina',
      'Subi foto de perfil y portada',
      'Complete la informacion del negocio',
      'Publique al menos un post',
    ],
    faq: [
      {
        question: 'Puedo usar mi perfil personal?',
        answer: 'No, Meta requiere una Pagina de negocio para publicidad. Tu perfil personal no puede tener anuncios.',
      },
      {
        question: 'Cuantas paginas puedo crear?',
        answer: 'Puedes crear hasta 6 paginas. Una por cada negocio o marca.',
      },
      {
        question: 'Necesito verificar la pagina?',
        answer: 'No es obligatorio para empezar, pero la verificacion aumenta la confianza.',
      },
    ],
    link: {
      label: 'Crear mi pagina',
      href: 'https://www.facebook.com/pages/create',
      external: true,
    },
  },
  {
    id: 'ad-account',
    icon: CreditCard,
    color: 'green',
    colorClasses: {
      bg: 'bg-green-600',
      bgLight: 'bg-green-50 dark:bg-green-950/30',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
      ring: 'ring-green-600/20',
      badgeBg: 'bg-green-100 dark:bg-green-900/40',
      badgeText: 'text-green-700 dark:text-green-300',
      iconBg: 'bg-green-100 dark:bg-green-900/40',
      sidebarActive: 'bg-green-50 dark:bg-green-950/30 border-green-600',
      sidebarHover: 'hover:bg-green-50/50 dark:hover:bg-green-950/20',
      checkAccent: 'accent-green-600',
    },
    title: 'Configura tu Cuenta Publicitaria',
    time: '10 min',
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed">
          La <strong className="text-foreground">cuenta publicitaria</strong> es donde se gestionan tus anuncios, presupuestos y pagos. Se crea dentro del <strong className="text-foreground">Business Manager</strong> (Administrador de Negocios) de Meta, que es la plataforma central para gestionar todos los activos de tu negocio.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Paso a paso</h3>
        <ol className="space-y-3 text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center text-sm font-semibold">1</span>
            <span>Ve a <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 underline underline-offset-2 hover:text-green-700">business.facebook.com</a> e inicia sesion.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center text-sm font-semibold">2</span>
            <span>Crea tu <strong className="text-foreground">cuenta de Business Manager</strong> con el nombre de tu empresa.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center text-sm font-semibold">3</span>
            <span>Ve a Configuracion &gt; Cuentas publicitarias &gt; <strong className="text-foreground">Agregar nueva cuenta publicitaria</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center text-sm font-semibold">4</span>
            <span>Configura la <strong className="text-foreground">moneda</strong> y <strong className="text-foreground">zona horaria</strong> de tu cuenta.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center text-sm font-semibold">5</span>
            <span>Agrega un <strong className="text-foreground">metodo de pago</strong> (tarjeta de credito/debito o PayPal).</span>
          </li>
        </ol>

        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 dark:text-amber-200 font-semibold text-sm">Importante: No se puede cambiar despues</p>
            <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">La <strong>moneda</strong> y la <strong>zona horaria</strong> se configuran al crear la cuenta publicitaria y <strong>no se pueden cambiar despues</strong>. Asegurate de elegirlas correctamente.</p>
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">Metodos de pago en LATAM</h3>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Visa y Mastercard (credito y debito)</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> PayPal (disponible en algunos paises)</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Tarjetas prepago (en algunos mercados)</li>
        </ul>
      </>
    ),
    checklist: [
      'Accedi a business.facebook.com',
      'Cree mi cuenta de Business Manager',
      'Cree una cuenta publicitaria',
      'Configure moneda y zona horaria (no se cambian despues!)',
      'Agregue un metodo de pago',
    ],
    faq: [
      {
        question: 'Puedo cambiar la moneda despues?',
        answer: 'No. La moneda y timezone se configuran al crear la cuenta y no se pueden cambiar. Tendrias que crear una nueva cuenta publicitaria.',
      },
      {
        question: 'Que metodos de pago aceptan en LATAM?',
        answer: 'Visa, Mastercard, y en algunos paises PayPal y tarjetas prepago.',
      },
      {
        question: 'Necesito tarjeta de credito?',
        answer: 'Puedes usar tarjeta de debito Visa/Mastercard. En algunos paises aceptan PayPal.',
      },
    ],
    link: {
      label: 'Ir a Business Manager',
      href: 'https://business.facebook.com',
      external: true,
    },
  },
  {
    id: 'pixel',
    icon: Code,
    color: 'purple',
    colorClasses: {
      bg: 'bg-purple-600',
      bgLight: 'bg-purple-50 dark:bg-purple-950/30',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
      ring: 'ring-purple-600/20',
      badgeBg: 'bg-purple-100 dark:bg-purple-900/40',
      badgeText: 'text-purple-700 dark:text-purple-300',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
      sidebarActive: 'bg-purple-50 dark:bg-purple-950/30 border-purple-600',
      sidebarHover: 'hover:bg-purple-50/50 dark:hover:bg-purple-950/20',
      checkAccent: 'accent-purple-600',
    },
    title: 'Instala el Pixel de Meta',
    time: '15 min',
    optional: true,
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed">
          El <strong className="text-foreground">Pixel de Meta</strong> es un pequeno codigo JavaScript que se instala en tu sitio web. Permite rastrear las acciones de los visitantes que llegan desde tus anuncios: compras, registros, vistas de productos, y mas.
        </p>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            <strong>Si no tienes sitio web</strong>, puedes crear campanas sin Pixel perfectamente. El Pixel solo es necesario para campanas de conversiones y retargeting.
          </p>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">Como crear e instalar el Pixel</h3>
        <ol className="space-y-3 text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-semibold">1</span>
            <span>En tu Business Manager, ve a <strong className="text-foreground">Origenes de datos &gt; Pixeles</strong> y crea uno nuevo.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-semibold">2</span>
            <span>Copia el <strong className="text-foreground">codigo base</strong> del Pixel.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-semibold">3</span>
            <span>Instala el codigo en tu sitio web:</span>
          </li>
        </ol>

        <div className="ml-10 mt-2 space-y-2 text-sm text-muted-foreground">
          <p><strong className="text-foreground">WordPress:</strong> Usa el plugin &quot;Meta Pixel&quot; oficial o pegalo en el header.</p>
          <p><strong className="text-foreground">Shopify:</strong> Preferencias &gt; Facebook Pixel &gt; pega tu ID.</p>
          <p><strong className="text-foreground">Wix:</strong> Marketing &gt; Integraciones de marketing &gt; Facebook Pixel.</p>
          <p><strong className="text-foreground">Manual:</strong> Pega el codigo antes de la etiqueta <code className="px-1.5 py-0.5 bg-muted rounded text-xs">&lt;/head&gt;</code> de tu sitio.</p>
        </div>

        <ol className="space-y-3 text-muted-foreground mt-4" start={4}>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-semibold">4</span>
            <span>Verifica que funciona con la extension <a href="https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc" target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 underline underline-offset-2">Meta Pixel Helper</a> de Chrome.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-semibold">5</span>
            <span>Configura <strong className="text-foreground">eventos estandar</strong> (Purchase, AddToCart, Lead, etc.) para el seguimiento de conversiones.</span>
          </li>
        </ol>
      </>
    ),
    checklist: [
      'Cree mi Pixel de Meta',
      'Copie el codigo del Pixel',
      'Instale el codigo en mi sitio web',
      'Verifique que el Pixel funciona',
      'Configure al menos un evento estandar',
    ],
    faq: [
      {
        question: 'Que es el Pixel exactamente?',
        answer: 'Es un codigo JavaScript que se instala en tu web para rastrear las acciones de los visitantes que llegan desde tus anuncios.',
      },
      {
        question: 'Es obligatorio instalar el Pixel?',
        answer: 'No. Puedes hacer campanas de trafico, reconocimiento y engagement sin Pixel. Solo es necesario para conversiones y retargeting.',
      },
      {
        question: 'Como verifico que funciona?',
        answer: 'Usa la extension Meta Pixel Helper de Chrome. Te muestra si el Pixel esta disparando correctamente.',
      },
    ],
  },
  {
    id: 'verification',
    icon: ShieldCheck,
    color: 'amber',
    colorClasses: {
      bg: 'bg-amber-600',
      bgLight: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      ring: 'ring-amber-600/20',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
      badgeText: 'text-amber-700 dark:text-amber-300',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      sidebarActive: 'bg-amber-50 dark:bg-amber-950/30 border-amber-600',
      sidebarHover: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
      checkAccent: 'accent-amber-600',
    },
    title: 'Verifica tu Negocio',
    time: '20 min',
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed">
          La <strong className="text-foreground">verificacion de negocio</strong> en Meta demuestra que tu empresa es legitima. Esto desbloquea funciones avanzadas, aumenta los limites de gasto publicitario, y genera mayor confianza en tu cuenta.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Beneficios de la verificacion</h3>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-500" /> Mayor limite de gasto publicitario</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-500" /> Acceso a funciones avanzadas de la API</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-500" /> Menor riesgo de restricciones en la cuenta</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-500" /> Mayor confianza para Meta y tus clientes</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6 mb-3">Documentos por pais</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="font-medium text-sm">Venezuela</p>
            <p className="text-xs text-muted-foreground mt-1">RIF, Registro Mercantil, o factura de servicios a nombre de la empresa.</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="font-medium text-sm">Mexico</p>
            <p className="text-xs text-muted-foreground mt-1">RFC (Constancia de Situacion Fiscal), acta constitutiva.</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="font-medium text-sm">Argentina</p>
            <p className="text-xs text-muted-foreground mt-1">CUIT, constancia de inscripcion AFIP, factura de servicios.</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="font-medium text-sm">Colombia / Peru</p>
            <p className="text-xs text-muted-foreground mt-1">RUC/NIT, Camara de Comercio, factura de servicios.</p>
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">Paso a paso</h3>
        <ol className="space-y-3 text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-semibold">1</span>
            <span>En Business Manager, ve a <strong className="text-foreground">Configuracion &gt; Centro de seguridad &gt; Verificacion de negocio</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-semibold">2</span>
            <span>Ingresa los datos de tu empresa (nombre legal, direccion, telefono).</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-semibold">3</span>
            <span>Sube los <strong className="text-foreground">documentos requeridos</strong> (el nombre debe coincidir exactamente).</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-semibold">4</span>
            <span>Envia la solicitud y espera la confirmacion (2-5 dias habiles generalmente).</span>
          </li>
        </ol>
      </>
    ),
    checklist: [
      'Accedi a la seccion de Verificacion de negocio',
      'Reuni los documentos necesarios',
      'Envie la solicitud de verificacion',
      'Meta confirmo la recepcion de mi solicitud',
    ],
    faq: [
      {
        question: 'Cuanto tarda la verificacion?',
        answer: 'Generalmente entre 2-5 dias habiles. Puede tardar hasta 2 semanas en casos complejos.',
      },
      {
        question: 'Que documentos necesito?',
        answer: 'Depende del pais. Generalmente: registro fiscal, registro mercantil o factura de servicios a nombre del negocio.',
      },
      {
        question: 'Que pasa si me rechazan?',
        answer: 'Puedes volver a enviar la solicitud con documentos corregidos. Asegurate que el nombre coincida exactamente.',
      },
    ],
  },
  {
    id: 'connect',
    icon: Plug,
    color: 'indigo',
    colorClasses: {
      bg: 'bg-indigo-600',
      bgLight: 'bg-indigo-50 dark:bg-indigo-950/30',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-800',
      ring: 'ring-indigo-600/20',
      badgeBg: 'bg-indigo-100 dark:bg-indigo-900/40',
      badgeText: 'text-indigo-700 dark:text-indigo-300',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
      sidebarActive: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-600',
      sidebarHover: 'hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20',
      checkAccent: 'accent-indigo-600',
    },
    title: 'Conecta con MetaAds Autopilot',
    time: '3 min',
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed">
          Ya tienes todo listo. Ahora es momento de conectar tu cuenta de Meta con <strong className="text-foreground">MetaAds Autopilot</strong> para que nuestra IA pueda crear y gestionar campanas en tu nombre.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Que permisos pedimos y por que</h3>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/50 border flex gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Acceso a cuentas publicitarias</p>
              <p className="text-xs text-muted-foreground mt-0.5">Para poder crear campanas, ad sets y anuncios en tu nombre.</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border flex gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Acceso a paginas</p>
              <p className="text-xs text-muted-foreground mt-0.5">Para publicar anuncios usando tu pagina como identidad.</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border flex gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Lectura de metricas</p>
              <p className="text-xs text-muted-foreground mt-0.5">Para mostrarte el rendimiento de tus campanas y optimizarlas con IA.</p>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">Paso a paso</h3>
        <ol className="space-y-3 text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-semibold">1</span>
            <span>Crea tu cuenta en MetaAds Autopilot (o inicia sesion si ya tienes una).</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-semibold">2</span>
            <span>En el onboarding, haz clic en <strong className="text-foreground">&quot;Conectar con Meta&quot;</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-semibold">3</span>
            <span>Autoriza los permisos solicitados en la ventana de Meta.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-semibold">4</span>
            <span>Selecciona la <strong className="text-foreground">cuenta publicitaria</strong> y <strong className="text-foreground">pagina</strong> que deseas usar.</span>
          </li>
        </ol>

        <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg flex gap-3">
          <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-700 dark:text-green-300 text-sm">
            <strong>100% seguro.</strong> Usamos OAuth de Meta (el mismo sistema que usan apps como Hootsuite o Buffer). Tus credenciales nunca se comparten con nosotros.
          </p>
        </div>
      </>
    ),
    checklist: [
      'Cree mi cuenta en MetaAds Autopilot',
      'Inicie el proceso de conexion con Meta',
      'Autorice los permisos necesarios',
      'Seleccione mi cuenta publicitaria y pagina',
    ],
    faq: [
      {
        question: 'Que permisos pide la app?',
        answer: 'Pedimos acceso a tu cuenta publicitaria y paginas para poder crear y gestionar campanas en tu nombre. No accedemos a datos personales.',
      },
      {
        question: 'Es seguro conectar mi cuenta?',
        answer: 'Si. Usamos OAuth de Meta (el mismo sistema que usan apps como Hootsuite). Tus credenciales nunca se comparten.',
      },
      {
        question: 'Puedo desconectar despues?',
        answer: 'Si, puedes desconectar en cualquier momento desde Configuracion > Conexion Meta.',
      },
    ],
    link: {
      label: 'Crear mi cuenta',
      href: '/register',
    },
  },
  {
    id: 'first-campaign',
    icon: Rocket,
    color: 'rose',
    colorClasses: {
      bg: 'bg-rose-600',
      bgLight: 'bg-rose-50 dark:bg-rose-950/30',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-800',
      ring: 'ring-rose-600/20',
      badgeBg: 'bg-rose-100 dark:bg-rose-900/40',
      badgeText: 'text-rose-700 dark:text-rose-300',
      iconBg: 'bg-rose-100 dark:bg-rose-900/40',
      sidebarActive: 'bg-rose-50 dark:bg-rose-950/30 border-rose-600',
      sidebarHover: 'hover:bg-rose-50/50 dark:hover:bg-rose-950/20',
      checkAccent: 'accent-rose-600',
    },
    title: 'Crea tu Primera Campana',
    time: '5 min',
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed">
          Este es el momento. Con todo configurado, vas a crear tu primera campana publicitaria usando nuestro <strong className="text-foreground">asistente de IA</strong>. Solo necesitas describir tu objetivo y la IA generara una campana completa para ti.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Como funciona el asistente de IA</h3>
        <ol className="space-y-3 text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-semibold">1</span>
            <span>Abre el <strong className="text-foreground">creador de campanas</strong> desde el dashboard.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-semibold">2</span>
            <span>Describe tu objetivo al asistente de IA. Se lo mas especifico posible.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-semibold">3</span>
            <span>La IA generara una campana completa: textos, audiencias, presupuesto.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-semibold">4</span>
            <span>Revisa y ajusta los detalles si es necesario (todo es editable).</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-semibold">5</span>
            <span>Publica tu campana directamente a Meta Ads.</span>
          </li>
        </ol>

        <h3 className="text-lg font-semibold mt-6 mb-3">Ejemplo de prompt</h3>
        <div className="p-4 bg-muted/50 border rounded-lg">
          <p className="text-sm italic text-muted-foreground">&quot;Quiero una campana de trafico para mi tienda de ropa femenina en Caracas. Mi presupuesto es de $10 por dia. Quiero llegar a mujeres de 25-45 anos interesadas en moda. Mi sitio web es mitienda.com&quot;</p>
        </div>
        <p className="text-xs text-muted-foreground mt-2">La IA generara una campana completa con textos, segmentacion, presupuesto y creatividades optimizadas.</p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Tips para mejores resultados</h3>
        <ul className="space-y-2 text-muted-foreground text-sm">
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" /> Se especifico con tu producto o servicio</li>
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" /> Incluye tu audiencia objetivo (edad, ubicacion, intereses)</li>
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" /> Menciona tu presupuesto diario</li>
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" /> Describe que quieres lograr (trafico, ventas, leads)</li>
          <li className="flex items-start gap-2"><Check className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" /> Empieza con $5-10 USD/dia para recopilar datos</li>
        </ul>
      </>
    ),
    checklist: [
      'Abri el creador de campanas con IA',
      'Describi mi objetivo al asistente',
      'Revise la campana generada por la IA',
      'Ajuste los detalles si fue necesario',
      'Publique mi primera campana',
    ],
    faq: [
      {
        question: 'Que tipo de prompts funcionan mejor?',
        answer: 'Se especifico: incluye tu producto, audiencia objetivo, presupuesto y que quieres lograr. Ejemplo: "Quiero una campana de trafico para mi tienda de ropa en Caracas, presupuesto $10/dia".',
      },
      {
        question: 'Puedo editar lo que genera la IA?',
        answer: 'Si, todo es editable. La IA genera una base que puedes ajustar: textos, audiencias, presupuesto, imagenes, todo.',
      },
      {
        question: 'Cuanto deberia invertir al inicio?',
        answer: 'Empieza con $5-10 USD/dia. Esto te permite recopilar datos suficientes para optimizar sin arriesgar mucho.',
      },
    ],
    link: {
      label: 'Crear mi primera campana',
      href: '/campaigns/new',
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Confetti overlay component                                         */
/* ------------------------------------------------------------------ */

function ConfettiOverlay({ onClose }: { onClose: () => void }) {
  const confettiColors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
    'bg-teal-500', 'bg-cyan-500', 'bg-rose-500', 'bg-amber-500',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Confetti pieces */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className={`absolute w-2.5 h-2.5 ${confettiColors[i % confettiColors.length]} ${i % 3 === 0 ? 'rounded-full' : i % 3 === 1 ? 'rounded-sm' : ''}`}
            style={{
              left: `${Math.random() * 100}%`,
              animationName: 'confetti-fall, confetti-shake',
              animationDuration: `${2 + Math.random() * 3}s, ${0.5 + Math.random() * 0.5}s`,
              animationTimingFunction: 'ease-in, ease-in-out',
              animationIterationCount: 'infinite, infinite',
              animationDelay: `${Math.random() * 3}s, ${Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Celebration card */}
      <div
        className="relative bg-card border rounded-2xl p-8 md:p-12 max-w-lg mx-4 text-center shadow-2xl"
        style={{
          animationName: 'celebration-pop',
          animationDuration: '0.5s',
          animationTimingFunction: 'ease-out',
          animationFillMode: 'both',
        }}
      >
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
          <PartyPopper className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-3">Felicitaciones!</h2>
        <p className="text-muted-foreground text-lg mb-2">
          Completaste todos los modulos de la guia.
        </p>
        <p className="text-muted-foreground mb-8">
          Ya estas listo para lanzar campanas publicitarias exitosas con MetaAds Autopilot.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/campaigns/new">
              <Rocket className="w-4 h-4 mr-2" />
              Crear mi primera campana
            </Link>
          </Button>
          <Button variant="outline" size="lg" onClick={onClose}>
            Seguir revisando la guia
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ Item component                                                 */
/* ------------------------------------------------------------------ */

function FAQItemComponent({ item, color }: { item: FAQItem; color: ModuleData['colorClasses'] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm pr-4">{item.question}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className={`px-4 pb-4 border-t ${color.bgLight}`}>
          <p className="text-sm text-muted-foreground pt-3">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Guide Page                                                    */
/* ------------------------------------------------------------------ */

export default function GuiaPage() {
  const [activeModule, setActiveModule] = useState(0);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiDismissed, setConfettiDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('guide-progress');
      if (saved) {
        setCheckedItems(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem('guide-progress', JSON.stringify(checkedItems));
    } catch {
      // ignore
    }
  }, [checkedItems, hydrated]);

  // Check completion
  const getModuleCompletion = useCallback(
    (mod: ModuleData) => {
      const total = mod.checklist.length;
      const checked = mod.checklist.filter((item) => checkedItems[`${mod.id}:${item}`]).length;
      return { total, checked, complete: checked === total && total > 0 };
    },
    [checkedItems]
  );

  const completedModules = modules.filter((m) => getModuleCompletion(m).complete).length;
  const allComplete = completedModules === modules.length;
  const progressPercent = Math.round((completedModules / modules.length) * 100);

  // Show confetti when all complete
  useEffect(() => {
    if (allComplete && hydrated && !confettiDismissed) {
      setShowConfetti(true);
    }
  }, [allComplete, hydrated, confettiDismissed]);

  const toggleCheck = (moduleId: string, item: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [`${moduleId}:${item}`]: !prev[`${moduleId}:${item}`],
    }));
  };

  const currentModule = modules[activeModule];
  const currentCompletion = getModuleCompletion(currentModule);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando guia...</div>
      </div>
    );
  }

  return (
    <>
      {/* Inject confetti keyframes */}
      <style dangerouslySetInnerHTML={{ __html: confettiStyles }} />

      {/* Confetti overlay */}
      {showConfetti && (
        <ConfettiOverlay
          onClose={() => {
            setShowConfetti(false);
            setConfettiDismissed(true);
          }}
        />
      )}

      <div className="min-h-screen bg-background">
        {/* ---- Header ---- */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <Zap className="w-5 h-5 text-primary" />
                <span className="hidden sm:inline">Volver al inicio</span>
              </Link>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium hidden sm:inline">
                  {completedModules}/{modules.length} modulos
                </span>
                <div className="w-32 sm:w-48">
                  <Progress value={progressPercent} className="h-2.5" />
                </div>
                <Badge
                  variant={allComplete ? 'default' : 'secondary'}
                  className={allComplete ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {progressPercent}%
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* ---- Page title ---- */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Como empezar con Meta Ads</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Guia paso a paso para configurar todo lo que necesitas para hacer publicidad en Facebook e Instagram. Completa cada modulo a tu ritmo.
          </p>
        </div>

        {/* ---- Mobile tabs (horizontal scroll) ---- */}
        <div className="md:hidden border-b bg-muted/30">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none -mx-4 px-4">
              {modules.map((mod, index) => {
                const Icon = mod.icon;
                const completion = getModuleCompletion(mod);
                return (
                  <button
                    key={mod.id}
                    onClick={() => setActiveModule(index)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                      activeModule === index
                        ? `${mod.colorClasses.bgLight} ${mod.colorClasses.text} border ${mod.colorClasses.border}`
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {completion.complete ? (
                      <div className={`w-5 h-5 rounded-full ${mod.colorClasses.bg} flex items-center justify-center flex-shrink-0`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    ) : (
                      <Icon className={`w-5 h-5 ${activeModule === index ? mod.colorClasses.text : ''}`} />
                    )}
                    <span className="max-w-[120px] truncate">{mod.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ---- Main layout ---- */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6">
            {/* ---- Desktop sidebar ---- */}
            <aside className="hidden md:block w-72 flex-shrink-0">
              <div className="sticky top-24">
                <nav className="space-y-1">
                  {modules.map((mod, index) => {
                    const Icon = mod.icon;
                    const completion = getModuleCompletion(mod);
                    const isActive = activeModule === index;

                    return (
                      <button
                        key={mod.id}
                        onClick={() => setActiveModule(index)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all border-l-[3px] ${
                          isActive
                            ? `${mod.colorClasses.sidebarActive} ${mod.colorClasses.text}`
                            : `border-transparent ${mod.colorClasses.sidebarHover} text-muted-foreground hover:text-foreground`
                        }`}
                      >
                        {/* Icon / completion indicator */}
                        {completion.complete ? (
                          <div className={`w-8 h-8 rounded-full ${mod.colorClasses.bg} flex items-center justify-center flex-shrink-0`}>
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className={`w-8 h-8 rounded-full ${mod.colorClasses.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${mod.colorClasses.text}`} />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium truncate ${isActive ? '' : ''}`}>
                              {mod.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{mod.time}</span>
                            {mod.optional && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                Opcional
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Progress indicator */}
                        {!completion.complete && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {completion.checked}/{completion.total}
                          </span>
                        )}

                        {isActive && (
                          <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-50" />
                        )}
                      </button>
                    );
                  })}
                </nav>

                {/* Completion summary in sidebar */}
                <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Tu progreso</span>
                    <span className="text-sm text-muted-foreground">{completedModules}/{modules.length}</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  {allComplete && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                      Todos los modulos completados!
                    </p>
                  )}
                </div>
              </div>
            </aside>

            {/* ---- Content area ---- */}
            <main className="flex-1 min-w-0">
              <Card className="overflow-hidden">
                {/* Module header */}
                <div className={`px-6 pt-6 pb-4 ${currentModule.colorClasses.bgLight} border-b ${currentModule.colorClasses.border}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${currentModule.colorClasses.bg} flex items-center justify-center flex-shrink-0`}>
                      <currentModule.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl sm:text-2xl font-bold">{currentModule.title}</h2>
                        {currentModule.optional && (
                          <Badge variant="outline" className="text-xs">
                            Opcional
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Clock className="w-3 h-3" />
                          {currentModule.time}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Modulo {activeModule + 1} de {modules.length}
                        </span>
                        {currentCompletion.complete && (
                          <Badge className="bg-green-600 hover:bg-green-700 text-xs gap-1">
                            <Check className="w-3 h-3" />
                            Completado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="pt-6">
                  {/* Module content */}
                  <div className="prose-sm max-w-none">
                    {currentModule.content}
                  </div>

                  {/* CTA Link */}
                  {currentModule.link && (
                    <div className="mt-8">
                      {currentModule.link.external ? (
                        <a
                          href={currentModule.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button className={`${currentModule.colorClasses.bg} hover:opacity-90 text-white`}>
                            {currentModule.link.label}
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </Button>
                        </a>
                      ) : (
                        <Link href={currentModule.link.href}>
                          <Button className={`${currentModule.colorClasses.bg} hover:opacity-90 text-white`}>
                            {currentModule.link.label}
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Checklist */}
                  <div className="mt-8 pt-8 border-t">
                    <h3 className="text-lg font-semibold mb-1">Checklist</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Marca cada paso a medida que lo completes. Tu progreso se guarda automaticamente.
                    </p>
                    <div className="space-y-2">
                      {currentModule.checklist.map((item, index) => {
                        const key = `${currentModule.id}:${item}`;
                        const isChecked = !!checkedItems[key];
                        return (
                          <label
                            key={index}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              isChecked
                                ? `${currentModule.colorClasses.bgLight} ${currentModule.colorClasses.border}`
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCheck(currentModule.id, item)}
                              className={`w-5 h-5 rounded border-2 cursor-pointer ${currentModule.colorClasses.checkAccent}`}
                            />
                            <span
                              className={`text-sm transition-all ${
                                isChecked ? 'line-through text-muted-foreground' : 'text-foreground'
                              }`}
                            >
                              {item}
                            </span>
                            {isChecked && (
                              <Check className={`w-4 h-4 ${currentModule.colorClasses.text} ml-auto flex-shrink-0`} />
                            )}
                          </label>
                        );
                      })}
                    </div>

                    {/* Checklist progress */}
                    <div className="mt-4 flex items-center gap-3">
                      <Progress
                        value={(currentCompletion.checked / currentCompletion.total) * 100}
                        className="h-1.5 flex-1"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {currentCompletion.checked} de {currentCompletion.total}
                      </span>
                    </div>
                  </div>

                  {/* FAQ */}
                  <div className="mt-8 pt-8 border-t">
                    <h3 className="text-lg font-semibold mb-1">Preguntas frecuentes</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Dudas comunes sobre este paso.
                    </p>
                    <div className="space-y-2">
                      {currentModule.faq.map((faqItem, index) => (
                        <FAQItemComponent
                          key={index}
                          item={faqItem}
                          color={currentModule.colorClasses}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Navigation buttons */}
                  <div className="mt-8 pt-6 border-t flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setActiveModule(Math.max(0, activeModule - 1))}
                      disabled={activeModule === 0}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Anterior
                    </Button>

                    {activeModule < modules.length - 1 ? (
                      <Button
                        onClick={() => setActiveModule(activeModule + 1)}
                        className={`${currentModule.colorClasses.bg} hover:opacity-90 text-white`}
                      >
                        Siguiente modulo
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        asChild
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Link href="/campaigns/new">
                          <Rocket className="w-4 h-4 mr-2" />
                          Crear mi campana
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </main>
          </div>
        </div>

        {/* ---- WhatsApp floating button ---- */}
        <a
          href="https://wa.me/584121234567"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-30 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
          aria-label="Contactar por WhatsApp"
        >
          <MessageCircle className="w-7 h-7 text-white" />
          <span className="absolute right-full mr-3 bg-card border shadow-md rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Necesitas ayuda?
          </span>
        </a>
      </div>
    </>
  );
}
