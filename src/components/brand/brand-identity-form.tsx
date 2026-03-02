'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Upload, X, Loader2, Sparkles, Palette, ImagePlus, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import { BrandAnalysisCard } from './brand-analysis-card';
import type { BrandColors, BrandAnalysis } from '@/types';

interface BrandIdentityFormProps {
  logoUrl: string | null;
  brandFiles: string[];
  brandColors: BrandColors | null;
  brandTypography: string | null;
  brandGallery: string[];
  brandAnalysis: BrandAnalysis | null;
  onLogoChange: (url: string | null) => void;
  onBrandFilesChange: (files: string[]) => void;
  onBrandColorsChange: (colors: BrandColors | null) => void;
  onBrandTypographyChange: (typography: string | null) => void;
  onBrandGalleryChange: (gallery: string[]) => void;
  onBrandAnalysisChange: (analysis: BrandAnalysis | null) => void;
  compact?: boolean;
}

const TYPOGRAPHY_OPTIONS = [
  { value: 'sans-serif', label: 'Sans Serif (moderna)' },
  { value: 'serif', label: 'Serif (clásica)' },
  { value: 'display', label: 'Display (decorativa)' },
  { value: 'handwritten', label: 'Manuscrita (personal)' },
  { value: 'monospace', label: 'Monospace (técnica)' },
  { value: 'mixed', label: 'Mixta' },
];

async function uploadFile(file: File, type: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  const res = await fetch('/api/upload/brand', { method: 'POST', body: formData });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Error al subir archivo');
  }
  const data = await res.json();
  return data.url;
}

export function BrandIdentityForm({
  logoUrl,
  brandFiles,
  brandColors,
  brandTypography,
  brandGallery,
  brandAnalysis,
  onLogoChange,
  onBrandFilesChange,
  onBrandColorsChange,
  onBrandTypographyChange,
  onBrandGalleryChange,
  onBrandAnalysisChange,
  compact = false,
}: BrandIdentityFormProps) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [extractingColors, setExtractingColors] = useState(false);
  const [analyzingBrand, setAnalyzingBrand] = useState(false);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadFile(file, 'logo');
      onLogoChange(url);
      toast.success('Logo subido');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir logo');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  }, [onLogoChange]);

  const handleBrandFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingFile(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadFile(file, 'brand-file');
        urls.push(url);
      }
      onBrandFilesChange([...brandFiles, ...urls]);
      toast.success(`${urls.length} archivo(s) subido(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir archivos');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  }, [brandFiles, onBrandFilesChange]);

  const handleGalleryUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingGallery(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadFile(file, 'gallery');
        urls.push(url);
      }
      onBrandGalleryChange([...brandGallery, ...urls]);
      toast.success(`${urls.length} foto(s) subida(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir fotos');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  }, [brandGallery, onBrandGalleryChange]);

  const handleExtractColors = useCallback(async () => {
    if (!logoUrl) {
      toast.error('Sube un logo primero');
      return;
    }
    setExtractingColors(true);
    try {
      const res = await fetch('/api/ai/extract-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al extraer colores');
      }
      const data = await res.json();
      const colors = data.colors as Array<{ hex: string; name: string }>;
      if (colors.length >= 3) {
        onBrandColorsChange({
          primary: colors[0].hex,
          secondary: colors[1].hex,
          accent: colors[2].hex,
        });
      } else if (colors.length >= 1) {
        onBrandColorsChange({
          primary: colors[0].hex,
          secondary: colors[1]?.hex || colors[0].hex,
          accent: colors[2]?.hex || colors[0].hex,
        });
      }
      toast.success('Colores extraídos del logo');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al extraer colores');
    } finally {
      setExtractingColors(false);
    }
  }, [logoUrl, onBrandColorsChange]);

  const handleAnalyzeBrand = useCallback(async () => {
    setAnalyzingBrand(true);
    try {
      const res = await fetch('/api/ai/analyze-brand', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al analizar marca');
      }
      const analysis = await res.json();
      onBrandAnalysisChange(analysis);
      toast.success('Análisis de marca completado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al analizar la marca');
    } finally {
      setAnalyzingBrand(false);
    }
  }, [onBrandAnalysisChange]);

  const handleColorChange = useCallback((field: keyof BrandColors, value: string) => {
    const current = brandColors || { primary: '#000000', secondary: '#666666', accent: '#0066FF' };
    onBrandColorsChange({ ...current, [field]: value });
  }, [brandColors, onBrandColorsChange]);

  return (
    <div className="space-y-5">
      {/* Logo */}
      <div>
        <Label className="text-sm font-medium">Logo</Label>
        <div className="mt-2 flex items-center gap-4">
          {logoUrl ? (
            <div className="relative w-16 h-16 rounded-lg border overflow-hidden bg-white">
              <Image src={logoUrl} alt="Logo" fill className="object-contain p-1" />
              <button
                type="button"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                onClick={() => onLogoChange(null)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                <span>
                  {uploadingLogo ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {logoUrl ? 'Cambiar logo' : 'Subir logo'}
                </span>
              </Button>
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
              />
            </label>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG o WebP. Max 5MB.</p>
          </div>
        </div>
      </div>

      {/* Colors */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Colores de marca</Label>
          {logoUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleExtractColors}
              disabled={extractingColors}
            >
              {extractingColors ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Palette className="h-3 w-3 mr-1" />
              )}
              Extraer del logo con IA
            </Button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(['primary', 'secondary', 'accent'] as const).map((field) => (
            <div key={field} className="space-y-1">
              <span className="text-xs text-muted-foreground capitalize">
                {field === 'primary' ? 'Primario' : field === 'secondary' ? 'Secundario' : 'Acento'}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandColors?.[field] || '#000000'}
                  onChange={(e) => handleColorChange(field, e.target.value)}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <Input
                  value={brandColors?.[field] || ''}
                  onChange={(e) => handleColorChange(field, e.target.value)}
                  placeholder="#000000"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div>
        <Label className="text-sm font-medium">Tipografía</Label>
        <Select
          value={brandTypography || ''}
          onValueChange={(val) => onBrandTypographyChange(val || null)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Selecciona el estilo tipográfico" />
          </SelectTrigger>
          <SelectContent>
            {TYPOGRAPHY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Extended sections (not in compact mode) */}
      {!compact && (
        <>
          <Separator />

          {/* Brand Files / Manual */}
          <div>
            <Label className="text-sm font-medium">Manual de marca / Archivos</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              Sube tu manual de marca, guías de estilo o materiales de referencia.
            </p>
            {brandFiles.length > 0 && (
              <div className="space-y-1 mb-2">
                {brandFiles.map((url, i) => {
                  const name = decodeURIComponent(url.split('/').pop() || `Archivo ${i + 1}`);
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted">
                      <FileUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate flex-1">{name}</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => onBrandFilesChange(brandFiles.filter((_, j) => j !== i))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild disabled={uploadingFile}>
                <span>
                  {uploadingFile ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <FileUp className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Subir archivos
                </span>
              </Button>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,image/png,image/jpeg"
                multiple
                onChange={handleBrandFileUpload}
                disabled={uploadingFile}
              />
            </label>
          </div>

          <Separator />

          {/* Gallery */}
          <div>
            <Label className="text-sm font-medium">Galería de fotos</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              Fotos de tus productos, local o equipo. La IA las analiza para entender tu estilo visual.
            </p>
            {brandGallery.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {brandGallery.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                    <Image src={url} alt={`Foto ${i + 1}`} fill className="object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/50 text-white flex items-center justify-center"
                      onClick={() => onBrandGalleryChange(brandGallery.filter((_, j) => j !== i))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild disabled={uploadingGallery}>
                <span>
                  {uploadingGallery ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Agregar fotos
                </span>
              </Button>
              <input
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleGalleryUpload}
                disabled={uploadingGallery}
              />
            </label>
          </div>

          <Separator />

          {/* AI Analysis */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Análisis IA de marca</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={handleAnalyzeBrand}
                disabled={analyzingBrand || (!logoUrl && brandGallery.length === 0)}
              >
                {analyzingBrand ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                {brandAnalysis ? 'Re-analizar marca' : 'Analizar mi marca con IA'}
              </Button>
            </div>
            {!logoUrl && brandGallery.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Sube un logo o fotos para habilitar el análisis IA.
              </p>
            )}
            {brandAnalysis && <BrandAnalysisCard analysis={brandAnalysis} />}
          </div>
        </>
      )}
    </div>
  );
}
