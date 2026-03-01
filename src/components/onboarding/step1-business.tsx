'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowRight, Building2 } from 'lucide-react';

const businessSchema = z.object({
  business_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  industry: z.string().min(1, 'Selecciona una industria'),
  description: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
});

export type BusinessFormData = z.infer<typeof businessSchema>;

const industries = [
  'E-commerce / Tienda Online',
  'Servicios Profesionales',
  'Restaurante / Alimentos',
  'Salud y Bienestar',
  'Educación / Cursos',
  'Tecnología / SaaS',
  'Bienes Raíces',
  'Moda y Belleza',
  'Deportes y Fitness',
  'Entretenimiento',
  'Automotriz',
  'Viajes y Turismo',
  'Finanzas / Seguros',
  'Construcción',
  'Otro',
];

interface Step1Props {
  defaultValues?: Partial<BusinessFormData>;
  onNext: (data: BusinessFormData) => void;
}

export function Step1Business({ defaultValues, onNext }: Step1Props) {
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
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
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

          <Button type="submit" className="w-full">
            Continuar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </Form>
    </div>
  );
}
