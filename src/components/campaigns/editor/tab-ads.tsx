'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Sparkles, Loader2, ImagePlus, X, RefreshCw, Film, Type, Eye, Upload, AlertCircle, Images, MessageSquareQuote } from 'lucide-react';
import dynamic from 'next/dynamic';

const HookGeneratorModal = dynamic(() => import('@/components/hooks/hook-generator-modal').then(m => ({ default: m.HookGeneratorModal })), { ssr: false });
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AdPreviewMock } from '../ad-preview-mock';
import { toast } from 'sonner';
import type { GeneratedCampaign, GeneratedAd, CarouselCard } from '@/lib/gemini/types';

interface TabAdsProps {
  data: GeneratedCampaign;
  onChange: (data: GeneratedCampaign) => void;
  businessName?: string;
  logoUrl?: string;
}

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Feed)' },
  { value: '9:16', label: '9:16 (Stories/Reels)' },
  { value: '16:9', label: '16:9 (Paisaje)' },
];

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

const FORMAT_LABELS: Record<string, string> = {
  single_image: 'Imagen',
  carousel: 'Carrusel',
  video: 'Video',
};

const EMPTY_CAROUSEL_CARD: CarouselCard = { image_url: '' };

export function TabAds({ data, onChange, businessName, logoUrl }: TabAdsProps) {
  const [generatingCopy, setGeneratingCopy] = useState<number | null>(null);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<number | null>(null);
  const [imagePrompts, setImagePrompts] = useState<Record<number, string>>({});
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<number, string>>({});
  const [expandedPreviews, setExpandedPreviews] = useState<Record<number, boolean>>({});
  const [uploadingVideo, setUploadingVideo] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);
  const [uploadingCarouselImage, setUploadingCarouselImage] = useState<string | null>(null);
  const [imageSourceMode, setImageSourceMode] = useState<Record<number, 'upload' | 'ai'>>({});

  const getTargetingContext = () => {
    const allCountries = new Set<string>();
    const allCities: Array<{ name: string }> = [];
    const allInterests: Array<{ name: string }> = [];
    let minAge = 65, maxAge = 18;

    for (const adSet of data.ad_sets) {
      adSet.targeting.geo_locations.countries?.forEach(c => allCountries.add(c));
      adSet.targeting.geo_locations.cities?.forEach(c => {
        if (!allCities.some(x => x.name === c.name)) allCities.push({ name: c.name });
      });
      adSet.targeting.interests?.forEach(i => {
        if (!allInterests.some(x => x.name === i.name)) allInterests.push({ name: i.name });
      });
      if (adSet.targeting.age_min < minAge) minAge = adSet.targeting.age_min;
      if (adSet.targeting.age_max > maxAge) maxAge = adSet.targeting.age_max;
    }

    return {
      countries: Array.from(allCountries),
      cities: allCities,
      age_min: minAge,
      age_max: maxAge,
      interests: allInterests,
    };
  };

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
          targeting_context: getTargetingContext(),
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
    } catch {
      toast.error('Error al generar el copy del anuncio');
    } finally {
      setGeneratingCopy(null);
    }
  };

  const regenerateAllAds = async () => {
    if (!businessName) return;
    setRegeneratingAll(true);

    try {
      const response = await fetch('/api/ai/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName,
          campaign_objective: data.campaign.objective,
          targeting_context: getTargetingContext(),
          num_variations: data.ads.length,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || 'Error al regenerar anuncios');
        return;
      }

      if (result.variations?.length > 0) {
        const updatedAds = data.ads.map((ad, i) => {
          const variation = result.variations[i] || result.variations[result.variations.length - 1];
          return {
            ...ad,
            primary_text: variation.primary_text,
            headline: variation.headline,
            description: variation.description,
          };
        });
        onChange({ ...data, ads: updatedAds });
        toast.success(`${data.ads.length} anuncios regenerados con la audiencia actual`);
      }
    } catch {
      toast.error('Error al regenerar los anuncios');
    } finally {
      setRegeneratingAll(false);
    }
  };

  const generateImage = async (index: number) => {
    const prompt = imagePrompts[index];
    if (!prompt?.trim()) {
      toast.error('Escribe una descripción para la imagen');
      return;
    }

    setGeneratingImage(index);
    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          businessName: businessName || undefined,
          aspectRatio: imageAspectRatios[index] || '1:1',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.upgrade) {
          toast.error(`Límite alcanzado: ${result.current}/${result.limit} imágenes. Mejora tu plan.`);
        } else {
          toast.error(result.error || 'Error al generar imagen');
        }
        return;
      }

      updateAd(index, { image_url: result.url });
      toast.success('Imagen generada exitosamente');
    } catch {
      toast.error('Error al generar la imagen');
    } finally {
      setGeneratingImage(null);
    }
  };

  const uploadImage = async (index: number, file: File, carouselCardIndex?: number) => {
    if (carouselCardIndex !== undefined) {
      setUploadingCarouselImage(`${index}-${carouselCardIndex}`);
    } else {
      setUploadingImage(index);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Error al subir la imagen');
        return;
      }

      if (carouselCardIndex !== undefined) {
        const cards = [...(data.ads[index].carousel_images || [])];
        cards[carouselCardIndex] = { ...cards[carouselCardIndex], image_url: result.url };
        updateAd(index, { carousel_images: cards });
      } else {
        updateAd(index, { image_url: result.url });
      }
      toast.success('Imagen subida exitosamente');
    } catch {
      toast.error('Error al subir la imagen');
    } finally {
      setUploadingImage(null);
      setUploadingCarouselImage(null);
    }
  };

  const uploadVideo = async (index: number, file: File) => {
    setUploadingVideo(index);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/video', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Error al subir el video');
        return;
      }

      updateAd(index, { video_url: result.url });
      toast.success('Video subido exitosamente');
    } catch {
      toast.error('Error al subir el video');
    } finally {
      setUploadingVideo(null);
    }
  };

  // Carousel helpers
  const addCarouselCard = (adIndex: number) => {
    const cards = [...(data.ads[adIndex].carousel_images || [])];
    if (cards.length >= 10) {
      toast.error('Máximo 10 tarjetas por carrusel');
      return;
    }
    cards.push({ ...EMPTY_CAROUSEL_CARD });
    updateAd(adIndex, { carousel_images: cards });
  };

  const removeCarouselCard = (adIndex: number, cardIndex: number) => {
    const cards = [...(data.ads[adIndex].carousel_images || [])];
    if (cards.length <= 2) {
      toast.error('Mínimo 2 tarjetas por carrusel');
      return;
    }
    cards.splice(cardIndex, 1);
    updateAd(adIndex, { carousel_images: cards });
  };

  const updateCarouselCard = (adIndex: number, cardIndex: number, updates: Partial<CarouselCard>) => {
    const cards = [...(data.ads[adIndex].carousel_images || [])];
    cards[cardIndex] = { ...cards[cardIndex], ...updates };
    updateAd(adIndex, { carousel_images: cards });
  };

  const handleFormatChange = (index: number, format: GeneratedAd['format']) => {
    const updates: Partial<GeneratedAd> = { format };
    if (format === 'carousel' && (!data.ads[index].carousel_images || data.ads[index].carousel_images!.length === 0)) {
      updates.carousel_images = [
        { ...EMPTY_CAROUSEL_CARD },
        { ...EMPTY_CAROUSEL_CARD },
        { ...EMPTY_CAROUSEL_CARD },
      ];
    }
    updateAd(index, updates);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-1">
        <h3 className="text-sm font-semibold">Anuncios</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Los anuncios son lo que <strong>las personas realmente ven</strong> en su feed, stories o reels. Cada anuncio tiene un texto principal, un título llamativo, una imagen y un botón de acción. Puedes crear varios anuncios para probar qué mensaje funciona mejor.
        </p>
      </div>

      {/* Regenerate all ads banner */}
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Sincronizar textos con tu audiencia</p>
          <p className="text-xs text-muted-foreground">
            Regenera los textos de todos los anuncios basándose en la segmentación actual de tus ad sets.
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="shrink-0 ml-4 gap-1.5"
          onClick={regenerateAllAds}
          disabled={regeneratingAll || generatingCopy !== null || !businessName}
        >
          {regeneratingAll ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {regeneratingAll ? 'Regenerando...' : 'Regenerar todos'}
        </Button>
      </div>

      <div className="space-y-4">
        {data.ads.map((ad, index) => (
          <Card key={index}>
            <CardContent className="p-4 space-y-0">
              {/* Ad header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Input
                    value={ad.name}
                    onChange={(e) => updateAd(index, { name: e.target.value })}
                    className="font-medium text-sm h-8 max-w-[200px]"
                  />
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {FORMAT_LABELS[ad.format] || ad.format}
                  </Badge>
                </div>
                {data.ads.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 ml-2 shrink-0" onClick={() => removeAd(index)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Format selector */}
              <div className="mb-4">
                <Label className="text-xs">Formato</Label>
                <Select
                  value={ad.format}
                  onValueChange={(v) => handleFormatChange(index, v as GeneratedAd['format'])}
                >
                  <SelectTrigger className="h-8 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="mb-4" />

              {/* Two-column layout: Left = Copy + Creative, Right = Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column: Copy + Creative */}
                <div className="space-y-4">
                  {/* SECTION: Copy */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <Type className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Textos</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Texto principal</Label>
                        <span className={`text-[10px] ${ad.primary_text.length > 125 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>{ad.primary_text.length}/125</span>
                      </div>
                      <Textarea
                        value={ad.primary_text}
                        onChange={(e) => updateAd(index, { primary_text: e.target.value })}
                        rows={2}
                        className="text-sm resize-none"
                        placeholder="Texto principal del anuncio"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Título</Label>
                          <span className={`text-[10px] ${ad.headline.length > 40 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>{ad.headline.length}/40</span>
                        </div>
                        <Input
                          value={ad.headline}
                          onChange={(e) => updateAd(index, { headline: e.target.value })}
                          placeholder="Título llamativo"
                          className="text-sm h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Descripción</Label>
                          <span className={`text-[10px] ${ad.description.length > 30 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>{ad.description.length}/30</span>
                        </div>
                        <Input
                          value={ad.description}
                          onChange={(e) => updateAd(index, { description: e.target.value })}
                          placeholder="Descripción breve"
                          className="text-sm h-8"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Botón de acción</Label>
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
                      <div className="space-y-1">
                        <Label className="text-xs">URL de destino</Label>
                        <Input
                          value={ad.destination_url || ''}
                          onChange={(e) => updateAd(index, { destination_url: e.target.value })}
                          placeholder="https://tu-sitio.com"
                          className="text-sm h-8"
                        />
                      </div>
                    </div>

                    {/* URL helper text */}
                    <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2">
                      <div className="flex gap-1.5 items-start">
                        <AlertCircle className="h-3 w-3 text-amber-600 mt-0.5 shrink-0" />
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-medium text-amber-800 dark:text-amber-400">Requisitos de Meta para URL de destino</p>
                          <ul className="text-[11px] text-amber-700 dark:text-amber-500 space-y-0 list-disc list-inside">
                            <li>HTTPS obligatorio (no HTTP)</li>
                            <li>Página funcional con carga rápida (&lt;3 segundos)</li>
                            <li>Contenido coherente con el anuncio</li>
                            <li>Compatible con dispositivos móviles</li>
                            <li>Política de privacidad visible</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => generateCopy(index)}
                      disabled={generatingCopy !== null}
                    >
                      {generatingCopy === index ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Generar textos con IA
                    </Button>
                    <HookGeneratorModal
                      campaigns={[{ id: (data.campaign as Record<string, unknown>)?.id as string || 'draft', name: (data.campaign as Record<string, unknown>)?.name as string || 'Campaña' }]}
                      selectedCampaignId={(data.campaign as Record<string, unknown>)?.id as string || 'draft'}
                      trigger={
                        <Button variant="outline" size="sm">
                          <MessageSquareQuote className="h-3.5 w-3.5 mr-1.5" />
                          Generar Hooks
                        </Button>
                      }
                    />
                  </div>

                  <Separator />

                  {/* SECTION: Creative */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      {ad.format === 'video' ? (
                        <Film className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : ad.format === 'carousel' ? (
                        <Images className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {ad.format === 'video' ? 'Video' : ad.format === 'carousel' ? 'Carrusel' : 'Imagen'}
                      </span>
                    </div>

                    {ad.format === 'video' ? (
                      /* Video format: local file upload */
                      <div className="space-y-3">
                        {ad.video_url ? (
                          <div className="relative group">
                            <video
                              src={ad.video_url}
                              controls
                              className="w-full max-w-[300px] rounded-md border"
                            />
                            <Button
                              variant="secondary"
                              size="icon"
                              className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => updateAd(index, { video_url: undefined })}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <p className="text-[10px] text-muted-foreground mt-1">Video cargado</p>
                          </div>
                        ) : (
                          <label
                            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 p-6 cursor-pointer hover:bg-muted/40 transition-colors ${
                              uploadingVideo === index ? 'pointer-events-none opacity-60' : ''
                            }`}
                          >
                            <input
                              type="file"
                              accept="video/mp4,video/quicktime,video/webm,video/mpeg,.mp4,.mov,.webm,.mpeg"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadVideo(index, file);
                                e.target.value = '';
                              }}
                              disabled={uploadingVideo !== null}
                            />
                            {uploadingVideo === index ? (
                              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                            ) : (
                              <Upload className="h-8 w-8 text-muted-foreground" />
                            )}
                            <p className="text-sm font-medium mt-2">
                              {uploadingVideo === index ? 'Subiendo video...' : 'Subir video'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              MP4, MOV, WebM · Máx 100MB
                            </p>
                          </label>
                        )}

                        {/* Allow changing video */}
                        {ad.video_url && (
                          <label className="block">
                            <input
                              type="file"
                              accept="video/mp4,video/quicktime,video/webm,video/mpeg,.mp4,.mov,.webm,.mpeg"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadVideo(index, file);
                                e.target.value = '';
                              }}
                              disabled={uploadingVideo !== null}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full pointer-events-none"
                              tabIndex={-1}
                            >
                              {uploadingVideo === index ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <Upload className="h-3.5 w-3.5 mr-1.5" />
                              )}
                              Cambiar video
                            </Button>
                          </label>
                        )}
                      </div>
                    ) : ad.format === 'carousel' ? (
                      /* Carousel format: multiple cards */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {(ad.carousel_images || []).length}/10 tarjetas · Meta recomienda 3-10
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => addCarouselCard(index)}
                            disabled={(ad.carousel_images || []).length >= 10}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Agregar tarjeta
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {(ad.carousel_images || []).map((card, cardIndex) => (
                            <div key={cardIndex} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">Tarjeta {cardIndex + 1}</span>
                                {(ad.carousel_images || []).length > 2 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => removeCarouselCard(index, cardIndex)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>

                              {/* Card image */}
                              {card.image_url ? (
                                <div className="relative group w-fit">
                                  <Image
                                    src={card.image_url}
                                    alt={`Tarjeta ${cardIndex + 1}`}
                                    width={120}
                                    height={120}
                                    className="w-[120px] h-[120px] rounded-md border object-cover"
                                  />
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => updateCarouselCard(index, cardIndex, { image_url: '' })}
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              ) : (
                                <label
                                  className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed bg-background p-4 cursor-pointer hover:bg-muted/30 transition-colors ${
                                    uploadingCarouselImage === `${index}-${cardIndex}` ? 'pointer-events-none opacity-60' : ''
                                  }`}
                                >
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) uploadImage(index, file, cardIndex);
                                      e.target.value = '';
                                    }}
                                    disabled={uploadingCarouselImage !== null}
                                  />
                                  {uploadingCarouselImage === `${index}-${cardIndex}` ? (
                                    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                                  ) : (
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                  )}
                                  <p className="text-[11px] text-muted-foreground mt-1">
                                    {uploadingCarouselImage === `${index}-${cardIndex}` ? 'Subiendo...' : 'Subir imagen'}
                                  </p>
                                </label>
                              )}

                              {/* Card fields */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-0.5">
                                  <Label className="text-[10px]">Título (opcional)</Label>
                                  <Input
                                    value={card.headline || ''}
                                    onChange={(e) => updateCarouselCard(index, cardIndex, { headline: e.target.value })}
                                    placeholder="Título de tarjeta"
                                    className="text-xs h-7"
                                  />
                                </div>
                                <div className="space-y-0.5">
                                  <Label className="text-[10px]">Descripción (opcional)</Label>
                                  <Input
                                    value={card.description || ''}
                                    onChange={(e) => updateCarouselCard(index, cardIndex, { description: e.target.value })}
                                    placeholder="Descripción"
                                    className="text-xs h-7"
                                  />
                                </div>
                              </div>
                              <div className="space-y-0.5">
                                <Label className="text-[10px]">URL de destino (opcional)</Label>
                                <Input
                                  value={card.destination_url || ''}
                                  onChange={(e) => updateCarouselCard(index, cardIndex, { destination_url: e.target.value })}
                                  placeholder="https://tu-sitio.com/producto"
                                  className="text-xs h-7"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Single image format: upload or AI */
                      <div className="space-y-3">
                        {ad.image_url && (
                          <div className="relative group w-fit">
                            <Image
                              src={ad.image_url}
                              alt="Imagen del anuncio"
                              width={200}
                              height={200}
                              className="w-[200px] h-[200px] rounded-md border object-cover"
                            />
                            <Button
                              variant="secondary"
                              size="icon"
                              className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => updateAd(index, { image_url: undefined })}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        {/* Toggle: Upload vs AI */}
                        <div className="flex rounded-lg border overflow-hidden">
                          <button
                            type="button"
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
                              (imageSourceMode[index] || 'upload') === 'upload'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                            }`}
                            onClick={() => setImageSourceMode(prev => ({ ...prev, [index]: 'upload' }))}
                          >
                            <Upload className="h-3 w-3" />
                            Subir imagen
                          </button>
                          <button
                            type="button"
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
                              imageSourceMode[index] === 'ai'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                            }`}
                            onClick={() => setImageSourceMode(prev => ({ ...prev, [index]: 'ai' }))}
                          >
                            <Sparkles className="h-3 w-3" />
                            Generar con IA
                          </button>
                        </div>

                        {(imageSourceMode[index] || 'upload') === 'upload' ? (
                          /* Upload mode */
                          <label
                            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 p-6 cursor-pointer hover:bg-muted/40 transition-colors ${
                              uploadingImage === index ? 'pointer-events-none opacity-60' : ''
                            }`}
                          >
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadImage(index, file);
                                e.target.value = '';
                              }}
                              disabled={uploadingImage !== null}
                            />
                            {uploadingImage === index ? (
                              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                            ) : (
                              <Upload className="h-8 w-8 text-muted-foreground" />
                            )}
                            <p className="text-sm font-medium mt-2">
                              {uploadingImage === index ? 'Subiendo imagen...' : 'Arrastra o haz clic para subir'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              JPEG, PNG, WebP, GIF · Máx 30MB
                            </p>
                          </label>
                        ) : (
                          /* AI generation mode */
                          <>
                            <Textarea
                              value={imagePrompts[index] || ''}
                              onChange={(e) => setImagePrompts((prev) => ({ ...prev, [index]: e.target.value }))}
                              placeholder="Describe la imagen que quieres generar (ej: producto de skincare sobre fondo blanco minimalista)"
                              rows={2}
                              className="text-sm resize-none"
                            />

                            <div className="flex gap-2">
                              <Select
                                value={imageAspectRatios[index] || '1:1'}
                                onValueChange={(v) => setImageAspectRatios((prev) => ({ ...prev, [index]: v }))}
                              >
                                <SelectTrigger className="h-8 w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ASPECT_RATIOS.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => generateImage(index)}
                                disabled={generatingImage !== null}
                              >
                                {generatingImage === index ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                {ad.image_url ? 'Regenerar imagen' : 'Generar imagen'}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right column: Preview */}
                <div className="space-y-2">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setExpandedPreviews(prev => ({ ...prev, [index]: !prev[index] }))}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Vista previa
                    <span className="text-[10px] font-normal normal-case">
                      {expandedPreviews[index] === false ? '(mostrar)' : '(ocultar)'}
                    </span>
                  </button>

                  {expandedPreviews[index] !== false && (
                    <div className="flex justify-center rounded-lg bg-muted/30 border border-dashed p-3">
                      <div className="transform scale-[0.85] origin-top">
                        <AdPreviewMock
                          format={ad.format}
                          primaryText={ad.primary_text || 'Texto del anuncio...'}
                          headline={ad.headline || 'Título...'}
                          description={ad.description || 'Descripción...'}
                          callToAction={ad.call_to_action}
                          pageName={businessName}
                          logoUrl={logoUrl}
                          imageUrl={ad.image_url}
                          videoUrl={ad.video_url}
                          carouselImages={ad.carousel_images}
                        />
                      </div>
                    </div>
                  )}
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
