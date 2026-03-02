'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Building2, Target, Users, Megaphone, Sparkles, Info, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { PersonaCard } from '@/components/personas/persona-card';
import { AngleCard } from '@/components/personas/angle-card';
import { PersonaEditor } from '@/components/personas/persona-editor';
import { AngleEditor } from '@/components/personas/angle-editor';
import { BrandIdentityForm } from '@/components/brand/brand-identity-form';
import type { BuyerPersona, SalesAngle, BrandColors, BrandAnalysis } from '@/types';

const businessSchema = z.object({
  business_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  industry: z.string().min(1, 'Selecciona una industria'),
  description: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  whatsapp: z.string().optional(),
});

const goalsSchema = z.object({
  objectives: z.array(z.string()).min(1, 'Selecciona al menos un objetivo'),
  monthly_budget: z.string().min(1, 'Selecciona tu presupuesto'),
  experience_level: z.string().min(1, 'Selecciona tu nivel'),
  brand_tone: z.string().min(1, 'Selecciona el tono'),
});

type BusinessData = z.infer<typeof businessSchema>;
type GoalsData = z.infer<typeof goalsSchema>;

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

export default function ProfilePage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [personas, setPersonas] = useState<BuyerPersona[]>([]);
  const [angles, setAngles] = useState<SalesAngle[]>([]);
  const [savingPersonas, setSavingPersonas] = useState(false);
  const [savingAngles, setSavingAngles] = useState(false);
  const [generatingPersonas, setGeneratingPersonas] = useState(false);
  const [suggestedPersonas, setSuggestedPersonas] = useState<BuyerPersona[]>([]);
  const [suggestedAngles, setSuggestedAngles] = useState<SalesAngle[]>([]);
  const [editingPersona, setEditingPersona] = useState<BuyerPersona | null>(null);
  const [personaEditorOpen, setPersonaEditorOpen] = useState(false);
  const [editingAngle, setEditingAngle] = useState<SalesAngle | null>(null);
  const [angleEditorOpen, setAngleEditorOpen] = useState(false);
  // Brand state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandFiles, setBrandFiles] = useState<string[]>([]);
  const [brandColors, setBrandColors] = useState<BrandColors | null>(null);
  const [brandTypography, setBrandTypography] = useState<string | null>(null);
  const [brandGallery, setBrandGallery] = useState<string[]>([]);
  const [brandAnalysis, setBrandAnalysis] = useState<BrandAnalysis | null>(null);
  const supabase = createClient();

  const businessForm = useForm<BusinessData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      business_name: '',
      industry: '',
      description: '',
      location: '',
      website: '',
      whatsapp: '',
    },
  });

  const goalsForm = useForm<GoalsData>({
    resolver: zodResolver(goalsSchema),
    defaultValues: {
      objectives: [],
      monthly_budget: '',
      experience_level: '',
      brand_tone: '',
    },
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          businessForm.reset({
            business_name: data.business_name || '',
            industry: data.industry || '',
            description: data.description || '',
            location: data.location || '',
            website: data.website || '',
            whatsapp: data.whatsapp || '',
          });
          goalsForm.reset({
            objectives: data.objectives || [],
            monthly_budget: data.monthly_budget || '',
            experience_level: data.experience_level || '',
            brand_tone: data.brand_tone || '',
          });
          setPersonas(data.buyer_personas || []);
          setAngles(data.sales_angles || []);
          // Brand data
          setLogoUrl(data.logo_url || null);
          setBrandFiles(data.brand_files || []);
          setBrandColors(data.brand_colors || null);
          setBrandTypography(data.brand_typography || null);
          setBrandGallery(data.brand_gallery || []);
          setBrandAnalysis(data.brand_analysis || null);
        }
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const saveBusiness = async (data: BusinessData) => {
    if (!user) return;
    setSavingBusiness(true);
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({
          business_name: data.business_name,
          industry: data.industry,
          description: data.description || null,
          location: data.location || null,
          website: data.website || null,
          whatsapp: data.whatsapp || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Datos del negocio actualizados');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSavingBusiness(false);
    }
  };

  const saveGoals = async (data: GoalsData) => {
    if (!user) return;
    setSavingGoals(true);
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({
          objectives: data.objectives,
          monthly_budget: data.monthly_budget,
          experience_level: data.experience_level,
          brand_tone: data.brand_tone,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Objetivos actualizados');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSavingGoals(false);
    }
  };

  const savePersonas = async (updated: BuyerPersona[]) => {
    if (!user) return;
    setSavingPersonas(true);
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({ buyer_personas: updated })
        .eq('user_id', user.id);
      if (error) throw error;
      setPersonas(updated);
      toast.success('Buyer personas actualizados');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSavingPersonas(false);
    }
  };

  const saveAnglesDB = async (updated: SalesAngle[]) => {
    if (!user) return;
    setSavingAngles(true);
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({ sales_angles: updated })
        .eq('user_id', user.id);
      if (error) throw error;
      setAngles(updated);
      toast.success('Ángulos de venta actualizados');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSavingAngles(false);
    }
  };

  const handleSavePersona = (persona: BuyerPersona) => {
    const idx = personas.findIndex(p => p.id === persona.id);
    const updated = idx >= 0
      ? personas.map((p, i) => i === idx ? persona : p)
      : [...personas, persona];
    savePersonas(updated);
  };

  const handleDeletePersona = (id: string) => {
    const updated = personas.filter(p => p.id !== id);
    savePersonas(updated);
    // Unlink angles
    const updatedAngles = angles.map(a =>
      a.target_persona_id === id ? { ...a, target_persona_id: undefined } : a
    );
    if (updatedAngles.some((a, i) => a !== angles[i])) {
      saveAnglesDB(updatedAngles);
    }
  };

  const handleSaveAngle = (angle: SalesAngle) => {
    const idx = angles.findIndex(a => a.id === angle.id);
    const updated = idx >= 0
      ? angles.map((a, i) => i === idx ? angle : a)
      : [...angles, angle];
    saveAnglesDB(updated);
  };

  const handleDeleteAngle = (id: string) => {
    saveAnglesDB(angles.filter(a => a.id !== id));
  };

  const handleGeneratePersonas = async () => {
    setGeneratingPersonas(true);
    try {
      const res = await fetch('/api/ai/suggest-personas', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al generar');
      }
      const data = await res.json();
      setSuggestedPersonas(data.buyer_personas);
      setSuggestedAngles(data.sales_angles);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar personas');
    } finally {
      setGeneratingPersonas(false);
    }
  };

  const handleAdoptPersona = (persona: BuyerPersona) => {
    const updated = [...personas, persona];
    savePersonas(updated);
    setSuggestedPersonas(prev => prev.filter(p => p.id !== persona.id));
  };

  const handleDismissPersona = (id: string) => {
    setSuggestedPersonas(prev => prev.filter(p => p.id !== id));
  };

  const handleAdoptAngle = (angle: SalesAngle) => {
    const updated = [...angles, angle];
    saveAnglesDB(updated);
    setSuggestedAngles(prev => prev.filter(a => a.id !== angle.id));
  };

  const handleDismissAngle = (id: string) => {
    setSuggestedAngles(prev => prev.filter(a => a.id !== id));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Perfil</h1>
          <p className="text-muted-foreground mt-1">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona la información de tu negocio y preferencias.
        </p>
      </div>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información del negocio
          </CardTitle>
          <CardDescription>
            Estos datos se usan para que la IA genere campañas personalizadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...businessForm}>
            <form onSubmit={businessForm.handleSubmit(saveBusiness)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={businessForm.control}
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
                  control={businessForm.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industria *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
              </div>

              <FormField
                control={businessForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe tu negocio, productos o servicios..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={businessForm.control}
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
                  control={businessForm.control}
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

                <FormField
                  control={businessForm.control}
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

              <Button type="submit" disabled={savingBusiness}>
                {savingBusiness ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar negocio
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objetivos y preferencias
          </CardTitle>
          <CardDescription>
            La IA usa esta información para personalizar estrategias y recomendaciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...goalsForm}>
            <form onSubmit={goalsForm.handleSubmit(saveGoals)} className="space-y-4">
              <FormField
                control={goalsForm.control}
                name="objectives"
                render={() => (
                  <FormItem>
                    <FormLabel>Objetivos publicitarios *</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {objectiveOptions.map((option) => (
                        <FormField
                          key={option.id}
                          control={goalsForm.control}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={goalsForm.control}
                  name="monthly_budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presupuesto mensual *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {budgetOptions.map((b) => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={goalsForm.control}
                  name="experience_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experiencia *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {experienceOptions.map((e) => (
                            <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={goalsForm.control}
                  name="brand_tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tono de marca *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {toneOptions.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={savingGoals}>
                {savingGoals ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar objetivos
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Brand Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Identidad de Marca
          </CardTitle>
          <CardDescription>
            Logo, colores y estilo visual. La IA usa esta información para generar anuncios coherentes con tu marca.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandIdentityForm
            logoUrl={logoUrl}
            brandFiles={brandFiles}
            brandColors={brandColors}
            brandTypography={brandTypography}
            brandGallery={brandGallery}
            brandAnalysis={brandAnalysis}
            onLogoChange={async (url) => {
              setLogoUrl(url);
              if (user) {
                await supabase.from('business_profiles').update({ logo_url: url }).eq('user_id', user.id);
              }
            }}
            onBrandFilesChange={async (files) => {
              setBrandFiles(files);
              if (user) {
                await supabase.from('business_profiles').update({ brand_files: files }).eq('user_id', user.id);
              }
            }}
            onBrandColorsChange={async (colors) => {
              setBrandColors(colors);
              if (user) {
                await supabase.from('business_profiles').update({ brand_colors: colors }).eq('user_id', user.id);
              }
            }}
            onBrandTypographyChange={async (typo) => {
              setBrandTypography(typo);
              if (user) {
                await supabase.from('business_profiles').update({ brand_typography: typo }).eq('user_id', user.id);
              }
            }}
            onBrandGalleryChange={async (gallery) => {
              setBrandGallery(gallery);
              if (user) {
                await supabase.from('business_profiles').update({ brand_gallery: gallery }).eq('user_id', user.id);
              }
            }}
            onBrandAnalysisChange={(analysis) => {
              setBrandAnalysis(analysis);
              // analyze-brand API saves to DB automatically
            }}
          />
        </CardContent>
      </Card>

      {/* Buyer Personas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Buyer Personas
          </CardTitle>
          <CardDescription>
            Perfiles ficticios de tus clientes ideales. La IA los usa para segmentar campañas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Un <strong>buyer persona</strong> es un perfil ficticio de tu cliente ideal.
              Incluye datos demográficos, problemas que enfrenta, motivaciones de compra y
              objeciones comunes. Esto ayuda a la IA a crear anuncios que resuenen con cada tipo de cliente.
            </AlertDescription>
          </Alert>

          {personas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay buyer personas definidos.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {personas.map(p => (
                <PersonaCard
                  key={p.id}
                  persona={p}
                  onEdit={(persona) => { setEditingPersona(persona); setPersonaEditorOpen(true); }}
                  onDelete={handleDeletePersona}
                />
              ))}
            </div>
          )}

          {/* AI Persona Suggestions */}
          {suggestedPersonas.length > 0 && (
            <div className="space-y-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium text-primary">Personas sugeridos por IA</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestedPersonas.map(p => (
                  <PersonaCard
                    key={p.id}
                    persona={p}
                    suggestion
                    onAdopt={handleAdoptPersona}
                    onDismiss={handleDismissPersona}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => { setEditingPersona(null); setPersonaEditorOpen(true); }}
              disabled={savingPersonas}
            >
              + Agregar persona
            </Button>
            <Button
              variant="outline"
              onClick={handleGeneratePersonas}
              disabled={generatingPersonas || savingPersonas}
            >
              {generatingPersonas ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Sugerencias IA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales Angles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Ángulos de Venta
          </CardTitle>
          <CardDescription>
            Las razones por las que tus clientes comprarían tu producto o servicio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Un <strong>ángulo de venta</strong> es una perspectiva o enfoque para vender tu producto.
              Incluye un &quot;hook&quot; (gancho de atención), una propuesta de valor y la emoción que activa.
              La IA usa estos ángulos como base para crear el copy de tus anuncios.
            </AlertDescription>
          </Alert>

          {angles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay ángulos de venta definidos.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {angles.map(a => (
                <AngleCard
                  key={a.id}
                  angle={a}
                  personas={personas}
                  onEdit={(angle) => { setEditingAngle(angle); setAngleEditorOpen(true); }}
                  onDelete={handleDeleteAngle}
                />
              ))}
            </div>
          )}

          {/* AI Angle Suggestions */}
          {suggestedAngles.length > 0 && (
            <div className="space-y-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium text-primary">Ángulos sugeridos por IA</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {suggestedAngles.map(a => (
                  <AngleCard
                    key={a.id}
                    angle={a}
                    personas={[...personas, ...suggestedPersonas]}
                    suggestion
                    onAdopt={handleAdoptAngle}
                    onDismiss={handleDismissAngle}
                  />
                ))}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => { setEditingAngle(null); setAngleEditorOpen(true); }}
            disabled={savingAngles}
          >
            + Agregar ángulo
          </Button>
        </CardContent>
      </Card>

      {/* Editors */}
      <PersonaEditor
        open={personaEditorOpen}
        onOpenChange={setPersonaEditorOpen}
        persona={editingPersona}
        onSave={handleSavePersona}
      />
      <AngleEditor
        open={angleEditorOpen}
        onOpenChange={setAngleEditorOpen}
        angle={editingAngle}
        personas={personas}
        onSave={handleSaveAngle}
      />
    </div>
  );
}
