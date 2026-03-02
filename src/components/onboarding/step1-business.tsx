'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Building2 } from 'lucide-react';
import { BrandIdentityForm } from '@/components/brand/brand-identity-form';
import type { BrandColors, BrandAnalysis } from '@/types';

const businessSchema = z.object({
  business_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  industry: z.string().min(1, 'Selecciona una industria'),
  description: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
});

export type BusinessFormData = z.infer<typeof businessSchema>;

export interface BrandFormData {
  logo_url: string | null;
  brand_colors: BrandColors | null;
  brand_typography: string | null;
}

const industries = [
  'Agricultura / Agroindustria',
  'Alimentos y Bebidas',
  'Automotriz',
  'Bienes Raíces / Inmobiliaria',
  'Construcción / Arquitectura',
  'Consultoría / Asesoría',
  'Contabilidad / Legal',
  'Deportes y Fitness',
  'E-commerce / Tienda Online',
  'Educación / Cursos',
  'Energía / Medio Ambiente',
  'Entretenimiento / Eventos',
  'Farmacia / Productos Médicos',
  'Finanzas / Seguros / Banca',
  'Fotografía / Producción Audiovisual',
  'Hotelería / Hospedaje',
  'Logística / Transporte / Envíos',
  'Marketing / Publicidad / Diseño',
  'Mascotas / Veterinaria',
  'Moda / Belleza / Cosmética',
  'ONG / Sin fines de lucro',
  'Restaurante / Cafetería',
  'Salud y Bienestar',
  'Servicios de Limpieza / Mantenimiento',
  'Servicios Profesionales',
  'Telecomunicaciones / Internet / ISP',
  'Tecnología / Software / SaaS',
  'Viajes y Turismo',
  'Otro',
];

interface Step1Props {
  defaultValues?: Partial<BusinessFormData>;
  defaultBrand?: Partial<BrandFormData>;
  onNext: (data: BusinessFormData, brand: BrandFormData) => void;
}

export function Step1Business({ defaultValues, defaultBrand, onNext }: Step1Props) {
  const [brandData, setBrandData] = useState<BrandFormData>({
    logo_url: defaultBrand?.logo_url || null,
    brand_colors: defaultBrand?.brand_colors || null,
    brand_typography: defaultBrand?.brand_typography || null,
  });

  const form = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      business_name: '',
      industry: '',
      description: '',
      location: '',
      website: '',
      whatsapp: '',
      ...defaultValues,
    },
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Tu Negocio</h2>
        <p className="text-muted-foreground">
          Cuéntanos sobre tu negocio para personalizar tu experiencia.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => onNext(data, brandData))} className="space-y-4">
          <FormField
            control={form.control}
            name="business_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del negocio *</FormLabel>
                <FormControl>
                  <Input placeholder="Mi Empresa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industria *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu industria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe brevemente tu negocio..."
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación</FormLabel>
                  <FormControl>
                    <Input placeholder="Ciudad, País" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="+52 123 456 7890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sitio web</FormLabel>
                <FormControl>
                  <Input placeholder="https://mi-sitio.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator className="my-2" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Identidad de Marca (opcional)</h3>
            <p className="text-xs text-muted-foreground">
              Sube tu logo y define tus colores para que la IA genere anuncios alineados a tu marca.
            </p>
          </div>
          <BrandIdentityForm
            compact
            logoUrl={brandData.logo_url}
            brandFiles={[]}
            brandColors={brandData.brand_colors}
            brandTypography={brandData.brand_typography}
            brandGallery={[]}
            brandAnalysis={null}
            onLogoChange={(url) => setBrandData(prev => ({ ...prev, logo_url: url }))}
            onBrandFilesChange={() => {}}
            onBrandColorsChange={(colors) => setBrandData(prev => ({ ...prev, brand_colors: colors }))}
            onBrandTypographyChange={(typo) => setBrandData(prev => ({ ...prev, brand_typography: typo }))}
            onBrandGalleryChange={() => {}}
            onBrandAnalysisChange={() => {}}
          />

          <Button type="submit" className="w-full">
            Continuar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </Form>
    </div>
  );
}
