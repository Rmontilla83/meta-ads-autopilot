'use client';

import { useState } from 'react';
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { AdPreviewMock } from '../ad-preview-mock';
import type { GeneratedCampaign, GeneratedAd } from '@/lib/gemini/types';

interface TabAdsProps {
  data: GeneratedCampaign;
  onChange: (data: GeneratedCampaign) => void;
  businessName?: string;
}

const FORMATS = [
  { value: 'single_image', label: 'Imagen única' },
  { value: 'carousel', label: 'Carrusel' },
  { value: 'video', label: 'Video' },
];

const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Más información' },
  { value: 'SHOP_NOW', label: 'Comprar' },
  { value: 'SIGN_UP', label: 'Registrarse' },
  { value: 'CONTACT_US', label: 'Contactar' },
  { value: 'GET_OFFER', label: 'Obtener oferta' },
  { value: 'BOOK_TRAVEL', label: 'Reservar' },
  { value: 'DOWNLOAD', label: 'Descargar' },
  { value: 'WATCH_MORE', label: 'Ver más' },
  { value: 'SEND_MESSAGE', label: 'Enviar mensaje' },
  { value: 'CALL_NOW', label: 'Llamar' },
  { value: 'APPLY_NOW', label: 'Aplicar' },
  { value: 'SUBSCRIBE', label: 'Suscribirse' },
];

export function TabAds({ data, onChange, businessName }: TabAdsProps) {
  const [generatingCopy, setGeneratingCopy] = useState<number | null>(null);

  const updateAd = (index: number, updates: Partial<GeneratedAd>) => {
    const ads = [...data.ads];
    ads[index] = { ...ads[index], ...updates };
    onChange({ ...data, ads });
  };

  const addAd = () => {
    const newAd: GeneratedAd = {
      name: `Anuncio ${data.ads.length + 1}`,
      format: 'single_image',
      primary_text: '',
      headline: '',
      description: '',
      call_to_action: 'LEARN_MORE',
    };
    onChange({ ...data, ads: [...data.ads, newAd] });
  };

  const removeAd = (index: number) => {
    if (data.ads.length <= 1) return;
    onChange({ ...data, ads: data.ads.filter((_, i) => i !== index) });
  };

  const generateCopy = async (index: number) => {
    if (!businessName) return;
    setGeneratingCopy(index);

    try {
      const response = await fetch('/api/ai/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          campaign_objective: data.campaign.objective,
        }),
      });

      const result = await response.json();
      if (result.variations?.length > 0) {
        const variation = result.variations[0];
        updateAd(index, {
          primary_text: variation.primary_text,
          headline: variation.headline,
          description: variation.description,
        });
      }
    } catch (error) {
      console.error('Error generating copy:', error);
    } finally {
      setGeneratingCopy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {data.ads.map((ad, index) => (
          <Card key={index}>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Input
                  value={ad.name}
                  onChange={(e) => updateAd(index, { name: e.target.value })}
                  className="font-medium text-sm h-8"
                />
                {data.ads.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-2"
                    onClick={() => removeAd(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <Select
                  value={ad.format}
                  onValueChange={(v) => updateAd(index, { format: v as GeneratedAd['format'] })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Texto principal</Label>
                  <span className="text-xs text-muted-foreground">{ad.primary_text.length}/125</span>
                </div>
                <Textarea
                  value={ad.primary_text}
                  onChange={(e) => updateAd(index, { primary_text: e.target.value })}
                  rows={2}
                  className="text-sm resize-none"
                  placeholder="Texto principal del anuncio"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Título</Label>
                  <span className="text-xs text-muted-foreground">{ad.headline.length}/40</span>
                </div>
                <Input
                  value={ad.headline}
                  onChange={(e) => updateAd(index, { headline: e.target.value })}
                  placeholder="Título llamativo"
                  className="text-sm h-8"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Descripción</Label>
                  <span className="text-xs text-muted-foreground">{ad.description.length}/30</span>
                </div>
                <Input
                  value={ad.description}
                  onChange={(e) => updateAd(index, { description: e.target.value })}
                  placeholder="Descripción breve"
                  className="text-sm h-8"
                />
              </div>

              <div className="space-y-2">
                <Label>Botón de acción</Label>
                <Select
                  value={ad.call_to_action}
                  onValueChange={(v) => updateAd(index, { call_to_action: v })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CTA_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>URL de destino</Label>
                <Input
                  value={ad.destination_url || ''}
                  onChange={(e) => updateAd(index, { destination_url: e.target.value })}
                  placeholder="https://tu-sitio.com"
                  className="text-sm h-8"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => generateCopy(index)}
                disabled={generatingCopy !== null}
              >
                {generatingCopy === index ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generar con IA
              </Button>

              {/* Preview */}
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-2">Vista previa</p>
                <div className="flex justify-center transform scale-75 origin-top">
                  <AdPreviewMock
                    format={ad.format}
                    primaryText={ad.primary_text || 'Texto del anuncio...'}
                    headline={ad.headline || 'Título...'}
                    description={ad.description || 'Descripción...'}
                    callToAction={ad.call_to_action}
                    pageName={businessName}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={addAd} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Agregar anuncio
      </Button>
    </div>
  );
}
