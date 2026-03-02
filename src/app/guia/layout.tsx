import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cómo crear tu cuenta de Meta Ads desde cero - Guía 2025 | MetaAds Autopilot',
  description: 'Guía paso a paso para crear tu página de Facebook, configurar tu cuenta publicitaria, instalar el Pixel de Meta y empezar a hacer publicidad. Gratis y en español.',
  keywords: ['Meta Ads', 'Facebook Ads', 'guía', 'tutorial', 'publicidad digital', 'crear cuenta publicitaria', 'pixel de meta'],
  openGraph: {
    title: 'Cómo crear tu cuenta de Meta Ads desde cero - Guía Completa',
    description: 'Te guiamos paso a paso para configurar todo lo que necesitas para hacer publicidad en Facebook e Instagram.',
    type: 'website',
  },
};

export default function GuiaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
