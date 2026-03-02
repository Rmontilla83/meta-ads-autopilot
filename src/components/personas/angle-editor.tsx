'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SalesAngle, BuyerPersona } from '@/types';

interface AngleEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  angle: SalesAngle | null;
  personas: BuyerPersona[];
  onSave: (angle: SalesAngle) => void;
}

const emotionalTriggers = [
  'frustración',
  'aspiración',
  'miedo',
  'curiosidad',
  'urgencia',
  'orgullo',
  'pertenencia',
  'comodidad',
  'ahorro',
  'exclusividad',
];

export function AngleEditor({ open, onOpenChange, angle, personas, onSave }: AngleEditorProps) {
  const [name, setName] = useState(angle?.name || '');
  const [hook, setHook] = useState(angle?.hook || '');
  const [valueProp, setValueProp] = useState(angle?.value_proposition || '');
  const [emotionalTrigger, setEmotionalTrigger] = useState(angle?.emotional_trigger || '');
  const [targetPersonaId, setTargetPersonaId] = useState<string>(angle?.target_persona_id || 'none');

  const resetForm = () => {
    setName(angle?.name || '');
    setHook(angle?.hook || '');
    setValueProp(angle?.value_proposition || '');
    setEmotionalTrigger(angle?.emotional_trigger || '');
    setTargetPersonaId(angle?.target_persona_id || 'none');
  };

  const handleSave = () => {
    if (!name.trim() || !hook.trim()) return;
    onSave({
      id: angle?.id || crypto.randomUUID(),
      name: name.trim(),
      hook: hook.trim(),
      value_proposition: valueProp.trim(),
      emotional_trigger: emotionalTrigger,
      target_persona_id: targetPersonaId === 'none' ? undefined : targetPersonaId,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{angle ? 'Editar Ángulo de Venta' : 'Nuevo Ángulo de Venta'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nombre *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Ahorro de tiempo" />
          </div>

          <div>
            <Label>Hook *</Label>
            <Textarea value={hook} onChange={e => setHook(e.target.value)} placeholder="Ej: ¿Cansado de perder horas en...?" rows={2} />
          </div>

          <div>
            <Label>Propuesta de valor</Label>
            <Textarea value={valueProp} onChange={e => setValueProp(e.target.value)} placeholder="Ej: Automatiza X y ahorra 10h/semana" rows={2} />
          </div>

          <div>
            <Label>Trigger emocional</Label>
            <Select value={emotionalTrigger} onValueChange={setEmotionalTrigger}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una emoción" />
              </SelectTrigger>
              <SelectContent>
                {emotionalTriggers.map(t => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {personas.length > 0 && (
            <div>
              <Label>Buyer persona vinculado (opcional)</Label>
              <Select value={targetPersonaId} onValueChange={setTargetPersonaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin vincular" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin vincular</SelectItem>
                  {personas.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim() || !hook.trim()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
