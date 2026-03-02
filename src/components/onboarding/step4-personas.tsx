'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ArrowRight, SkipForward, Sparkles, Users, Megaphone, Loader2, Info } from 'lucide-react';
import { PersonaCard } from '@/components/personas/persona-card';
import { AngleCard } from '@/components/personas/angle-card';
import { PersonaEditor } from '@/components/personas/persona-editor';
import { AngleEditor } from '@/components/personas/angle-editor';
import type { BuyerPersona, SalesAngle } from '@/types';

interface Step4PersonasProps {
  defaultPersonas?: BuyerPersona[];
  defaultAngles?: SalesAngle[];
  onNext: (data: { buyer_personas: BuyerPersona[]; sales_angles: SalesAngle[] }) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function Step4Personas({ defaultPersonas, defaultAngles, onNext, onSkip, onBack }: Step4PersonasProps) {
  // Adopted (saved) items
  const [personas, setPersonas] = useState<BuyerPersona[]>(defaultPersonas || []);
  const [angles, setAngles] = useState<SalesAngle[]>(defaultAngles || []);

  // AI suggestions (pending adoption)
  const [suggestedPersonas, setSuggestedPersonas] = useState<BuyerPersona[]>([]);
  const [suggestedAngles, setSuggestedAngles] = useState<SalesAngle[]>([]);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [editingPersona, setEditingPersona] = useState<BuyerPersona | null>(null);
  const [personaEditorOpen, setPersonaEditorOpen] = useState(false);
  const [editingAngle, setEditingAngle] = useState<SalesAngle | null>(null);
  const [angleEditorOpen, setAngleEditorOpen] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
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
      setError(err instanceof Error ? err.message : 'Error al generar personas');
    } finally {
      setGenerating(false);
    }
  };

  // Adopt a suggested persona
  const handleAdoptPersona = (persona: BuyerPersona) => {
    setPersonas(prev => [...prev, persona]);
    setSuggestedPersonas(prev => prev.filter(p => p.id !== persona.id));
  };

  // Dismiss a suggested persona
  const handleDismissPersona = (id: string) => {
    setSuggestedPersonas(prev => prev.filter(p => p.id !== id));
  };

  // Adopt a suggested angle
  const handleAdoptAngle = (angle: SalesAngle) => {
    setAngles(prev => [...prev, angle]);
    setSuggestedAngles(prev => prev.filter(a => a.id !== angle.id));
  };

  // Dismiss a suggested angle
  const handleDismissAngle = (id: string) => {
    setSuggestedAngles(prev => prev.filter(a => a.id !== id));
  };

  const handleSavePersona = (persona: BuyerPersona) => {
    setPersonas(prev => {
      const idx = prev.findIndex(p => p.id === persona.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = persona;
        return updated;
      }
      return [...prev, persona];
    });
  };

  const handleDeletePersona = (id: string) => {
    setPersonas(prev => prev.filter(p => p.id !== id));
    setAngles(prev => prev.map(a =>
      a.target_persona_id === id ? { ...a, target_persona_id: undefined } : a
    ));
  };

  const handleSaveAngle = (angle: SalesAngle) => {
    setAngles(prev => {
      const idx = prev.findIndex(a => a.id === angle.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = angle;
        return updated;
      }
      return [...prev, angle];
    });
  };

  const handleDeleteAngle = (id: string) => {
    setAngles(prev => prev.filter(a => a.id !== id));
  };

  const hasSuggestions = suggestedPersonas.length > 0 || suggestedAngles.length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Audiencia</h2>
        <p className="text-muted-foreground">
          Define quién es tu cliente ideal y cómo venderle.
        </p>
      </div>

      {/* Explainer banner */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Buyer personas</strong> son perfiles ficticios de tus clientes ideales (ej: &quot;Profesional joven de 28 años que busca eficiencia&quot;).{' '}
          <strong>Ángulos de venta</strong> son las razones por las que comprarían tu producto (ej: &quot;Ahorra 10 horas por semana&quot;).
          La IA usará estos datos para crear campañas mejor segmentadas.
        </AlertDescription>
      </Alert>

      {/* AI Generate button */}
      <div className="flex justify-center">
        <Button onClick={handleGenerate} disabled={generating} variant="outline" size="lg">
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {generating ? 'Generando...' : 'Generar con IA'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* AI Suggestions section */}
      {hasSuggestions && (
        <div className="space-y-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-primary">Sugerencias de la IA</h3>
            <span className="text-xs text-muted-foreground">Haz clic en &quot;Agregar&quot; para adoptar cada sugerencia</span>
          </div>

          {suggestedPersonas.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Buyer Personas sugeridos
              </h4>
              <div className="grid grid-cols-1 gap-2">
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

          {suggestedAngles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-1.5">
                <Megaphone className="h-3.5 w-3.5" /> Ángulos de Venta sugeridos
              </h4>
              <div className="grid grid-cols-1 gap-2">
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
        </div>
      )}

      {/* Adopted Buyer Personas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" /> Buyer Personas
            {personas.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">({personas.length})</span>
            )}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEditingPersona(null); setPersonaEditorOpen(true); }}
          >
            + Agregar manualmente
          </Button>
        </div>
        {personas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aún no hay buyer personas. Usa &quot;Generar con IA&quot; o agrega manualmente.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
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
      </div>

      <Separator />

      {/* Adopted Sales Angles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Ángulos de Venta
            {angles.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">({angles.length})</span>
            )}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEditingAngle(null); setAngleEditorOpen(true); }}
          >
            + Agregar manualmente
          </Button>
        </div>
        {angles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aún no hay ángulos de venta. Usa &quot;Generar con IA&quot; o agrega manualmente.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
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
      </div>

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

      {/* Navigation buttons */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
        </Button>
        <Button type="button" variant="ghost" onClick={onSkip}>
          <SkipForward className="mr-2 h-4 w-4" /> Omitir
        </Button>
        <Button
          type="button"
          onClick={() => onNext({ buyer_personas: personas, sales_angles: angles })}
          className="flex-1"
          disabled={personas.length === 0 && angles.length === 0}
        >
          Continuar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
