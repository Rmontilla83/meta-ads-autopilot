'use client';

import { FileText, Image, Users, MessageSquareQuote } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TestTypeSelectorProps {
  selected: string | null;
  onSelect: (type: 'copy' | 'creative' | 'audience' | 'hook') => void;
}

const TEST_TYPES = [
  {
    id: 'copy' as const,
    title: 'Copy / Textos',
    description: 'Prueba diferentes textos, titulares y descripciones para encontrar el mensaje que mejor convierte.',
    icon: FileText,
  },
  {
    id: 'creative' as const,
    title: 'Creativos / Imágenes',
    description: 'Compara diferentes conceptos visuales e imágenes para descubrir qué estilo atrae más atención.',
    icon: Image,
  },
  {
    id: 'audience' as const,
    title: 'Audiencias',
    description: 'Prueba diferentes segmentos de audiencia para encontrar el público que mejor responde a tu oferta.',
    icon: Users,
  },
  {
    id: 'hook' as const,
    title: 'Hooks / Ganchos',
    description: 'Compara diferentes primeras líneas para descubrir qué ángulo captura más atención inmediata.',
    icon: MessageSquareQuote,
  },
];

export function TestTypeSelector({ selected, onSelect }: TestTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {TEST_TYPES.map((type) => {
        const Icon = type.icon;
        const isSelected = selected === type.id;

        return (
          <Card
            key={type.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              isSelected
                ? 'ring-2 ring-primary border-primary shadow-md'
                : 'hover:border-zinc-400'
            )}
            onClick={() => onSelect(type.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-zinc-100 text-zinc-600'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{type.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                {type.description}
              </CardDescription>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
