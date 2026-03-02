'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Check, X, Palette, Sparkles } from 'lucide-react';
import type { BrandAnalysis } from '@/types';

interface BrandAnalysisCardProps {
  analysis: BrandAnalysis;
}

export function BrandAnalysisCard({ analysis }: BrandAnalysisCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Análisis de Marca (IA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm text-muted-foreground">{analysis.summary}</p>

        {/* Color Palette */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Paleta de colores</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.color_palette.map((color, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-5 h-5 rounded border border-border"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-muted-foreground">{color.name}</span>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Visual Style */}
        <div>
          <span className="text-xs font-medium">Estilo visual</span>
          <p className="text-xs text-muted-foreground mt-1">{analysis.visual_style}</p>
        </div>

        {/* Personality */}
        <div>
          <span className="text-xs font-medium">Personalidad</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {analysis.personality.map((trait, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {trait}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Do's and Don'ts */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs font-medium text-green-600">Hacer</span>
            <ul className="mt-1 space-y-1">
              {analysis.dos.map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <Check className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-xs font-medium text-red-600">No hacer</span>
            <ul className="mt-1 space-y-1">
              {analysis.donts.map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <X className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommended Ad Styles */}
        <div>
          <span className="text-xs font-medium">Estilos recomendados para anuncios</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {analysis.recommended_ad_styles.map((style, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {style}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
