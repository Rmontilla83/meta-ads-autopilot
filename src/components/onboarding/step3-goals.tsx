'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, ArrowRight, Target } from 'lucide-react';

const goalsSchema = z.object({
  objectives: z.array(z.string()).min(1, 'Selecciona al menos un objetivo'),
  monthly_budget: z.string().min(1, 'Selecciona tu presupuesto'),
  experience_level: z.string().min(1, 'Selecciona tu nivel de experiencia'),
  brand_tone: z.string().min(1, 'Selecciona el tono de tu marca'),
});

export type GoalsFormData = z.infer<typeof goalsSchema>;

const objectiveOptions = [
  { id: 'brand_awareness', label: 'Reconocimiento de marca' },
  { id: 'traffic', label: 'Tráfico al sitio web' },
  { id: 'engagement', label: 'Interacción con publicaciones' },
  { id: 'leads', label: 'Generación de leads' },
  { id: 'sales', label: 'Ventas / Conversiones' },
  { id: 'app_installs', label: 'Instalaciones de app' },
  { id: 'messages', label: 'Mensajes (WhatsApp/Messenger)' },
  { id: 'video_views', label: 'Visualizaciones de video' },
];

const budgetOptions = [
  'Menos de $500 USD/mes',
  '$500 - $2,000 USD/mes',
  '$2,000 - $5,000 USD/mes',
  '$5,000 - $10,000 USD/mes',
  '$10,000 - $50,000 USD/mes',
  'Más de $50,000 USD/mes',
];

const experienceOptions = [
  { value: 'beginner', label: 'Principiante - Nunca he usado Meta Ads' },
  { value: 'intermediate', label: 'Intermedio - He creado algunas campañas' },
  { value: 'advanced', label: 'Avanzado - Gestiono campañas regularmente' },
  { value: 'expert', label: 'Experto - Soy profesional de publicidad digital' },
];

const toneOptions = [
  { value: 'professional', label: 'Profesional y corporativo' },
  { value: 'friendly', label: 'Amigable y cercano' },
  { value: 'bold', label: 'Audaz y directo' },
  { value: 'inspirational', label: 'Inspiracional y motivacional' },
  { value: 'funny', label: 'Divertido y casual' },
  { value: 'luxury', label: 'Elegante y premium' },
];

interface Step3Props {
  defaultValues?: Partial<GoalsFormData>;
  onNext: (data: GoalsFormData) => void;
  onBack: () => void;
}

export function Step3Goals({ defaultValues, onNext, onBack }: Step3Props) {
  const form = useForm<GoalsFormData>({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      objectives: [],
      monthly_budget: '',
      experience_level: '',
      brand_tone: '',
      ...defaultValues,
    },
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Target className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Objetivos y Preferencias</h2>
        <p className="text-muted-foreground">
          Ayúdanos a personalizar las recomendaciones de la IA para tu negocio.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <FormField
            control={form.control}
            name="objectives"
            render={() => (
              <FormItem>
                <FormLabel>¿Cuáles son tus objetivos publicitarios? *</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {objectiveOptions.map((option) => (
                    <FormField
                      key={option.id}
                      control={form.control}
                      name="objectives"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(option.id)}
                              onCheckedChange={(checked) => {
                                const updated = checked
                                  ? [...(field.value || []), option.id]
                                  : (field.value || []).filter((v) => v !== option.id);
                                field.onChange(updated);
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {option.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="monthly_budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Presupuesto mensual aproximado *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu presupuesto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {budgetOptions.map((budget) => (
                      <SelectItem key={budget} value={budget}>
                        {budget}
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
            name="experience_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel de experiencia con Meta Ads *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu nivel" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {experienceOptions.map((exp) => (
                      <SelectItem key={exp.value} value={exp.value}>
                        {exp.label}
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
            name="brand_tone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tono de tu marca *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tono" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {toneOptions.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {tone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
            </Button>
            <Button type="submit" className="flex-1">
              Continuar <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
