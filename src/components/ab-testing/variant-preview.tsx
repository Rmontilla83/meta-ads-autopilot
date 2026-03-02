'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ABTestVariant } from '@/types';

interface VariantPreviewProps {
  variant: ABTestVariant;
  index: number;
  isWinner?: boolean;
}

const VARIANT_COLORS = [
  'border-blue-200 bg-blue-50/50',
  'border-emerald-200 bg-emerald-50/50',
  'border-amber-200 bg-amber-50/50',
  'border-purple-200 bg-purple-50/50',
  'border-rose-200 bg-rose-50/50',
];

const VARIANT_LETTERS = ['A', 'B', 'C', 'D', 'E'];

export function VariantPreview({ variant, index, isWinner }: VariantPreviewProps) {
  const colorClass = VARIANT_COLORS[index % VARIANT_COLORS.length];
  const letter = VARIANT_LETTERS[index % VARIANT_LETTERS.length];

  return (
    <Card className={colorClass}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-bold text-sm">
              {letter}
            </Badge>
            <CardTitle className="text-sm font-medium">{variant.name}</CardTitle>
          </div>
          {isWinner && (
            <Badge className="bg-emerald-600 text-white">
              Ganador
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Copy preview */}
        {variant.config?.copy && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Copy del anuncio
            </p>
            <div className="bg-white rounded-lg p-3 border space-y-1">
              <p className="text-sm">{variant.config.copy.primary_text}</p>
              <p className="text-sm font-semibold">{variant.config.copy.headline}</p>
              {variant.config.copy.description && (
                <p className="text-xs text-muted-foreground">{variant.config.copy.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Hook preview */}
        {variant.config?.hook && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Hook / Gancho
            </p>
            <div className="bg-white rounded-lg p-3 border">
              <p className="text-sm italic">&quot;{variant.config.hook}&quot;</p>
            </div>
          </div>
        )}

        {/* Image prompt preview */}
        {variant.config?.image_prompt && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Concepto visual
            </p>
            <div className="bg-white rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground">{variant.config.image_prompt}</p>
            </div>
          </div>
        )}

        {/* Targeting preview */}
        {variant.config?.targeting && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Segmentación
            </p>
            <div className="bg-white rounded-lg p-3 border">
              {renderTargetingSummary(variant.config.targeting)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function renderTargetingSummary(targeting: Record<string, unknown>) {
  const parts: string[] = [];

  if (targeting.age_min || targeting.age_max) {
    parts.push(`Edad: ${targeting.age_min || 18}-${targeting.age_max || 65}`);
  }

  const genders = targeting.genders as number[] | undefined;
  if (genders?.length && !genders.includes(0)) {
    const labels = genders.map((g) => (g === 1 ? 'Masculino' : 'Femenino'));
    parts.push(`Género: ${labels.join(', ')}`);
  }

  const geo = targeting.geo_locations as { countries?: string[]; cities?: Array<{ name: string }>; regions?: Array<{ name: string }> } | undefined;
  if (geo) {
    if (geo.countries?.length) parts.push(`Países: ${geo.countries.join(', ')}`);
    if (geo.cities?.length) parts.push(`Ciudades: ${geo.cities.map((c) => c.name).join(', ')}`);
    if (geo.regions?.length) parts.push(`Regiones: ${geo.regions.map((r) => r.name).join(', ')}`);
  }

  const interests = targeting.interests as Array<{ name: string }> | undefined;
  if (interests?.length) {
    parts.push(`Intereses: ${interests.map((i) => i.name).join(', ')}`);
  }

  return (
    <div className="space-y-1">
      {parts.map((part, i) => (
        <p key={i} className="text-xs text-muted-foreground">{part}</p>
      ))}
      {parts.length === 0 && (
        <p className="text-xs text-muted-foreground">Segmentación no especificada</p>
      )}
    </div>
  );
}
