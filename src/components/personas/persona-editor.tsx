'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { BuyerPersona } from '@/types';

interface PersonaEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: BuyerPersona | null;
  onSave: (persona: BuyerPersona) => void;
}

export function PersonaEditor({ open, onOpenChange, persona, onSave }: PersonaEditorProps) {
  const [name, setName] = useState(persona?.name || '');
  const [description, setDescription] = useState(persona?.description || '');
  const [demographics, setDemographics] = useState(persona?.demographics || '');
  const [painPoints, setPainPoints] = useState<string[]>(persona?.pain_points || []);
  const [motivations, setMotivations] = useState<string[]>(persona?.motivations || []);
  const [objections, setObjections] = useState<string[]>(persona?.objections || []);
  const [painInput, setPainInput] = useState('');
  const [motivationInput, setMotivationInput] = useState('');
  const [objectionInput, setObjectionInput] = useState('');

  // Reset state when persona prop changes
  const resetForm = () => {
    setName(persona?.name || '');
    setDescription(persona?.description || '');
    setDemographics(persona?.demographics || '');
    setPainPoints(persona?.pain_points || []);
    setMotivations(persona?.motivations || []);
    setObjections(persona?.objections || []);
    setPainInput('');
    setMotivationInput('');
    setObjectionInput('');
  };

  const handleAddTag = (
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void,
  ) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setInput('');
  };

  const handleRemoveTag = (index: number, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: persona?.id || crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      demographics: demographics.trim(),
      pain_points: painPoints,
      motivations,
      objections,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{persona ? 'Editar Buyer Persona' : 'Nuevo Buyer Persona'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nombre *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Profesional joven" />
          </div>

          <div>
            <Label>Descripción</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe quién es este persona..." rows={2} />
          </div>

          <div>
            <Label>Demografía</Label>
            <Input value={demographics} onChange={e => setDemographics(e.target.value)} placeholder="Ej: 25-35 años, profesional, urbano" />
          </div>

          {/* Pain Points */}
          <div>
            <Label>Pain points</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={painInput}
                onChange={e => setPainInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(painInput, painPoints, setPainPoints, setPainInput); } }}
                placeholder="Escribe y presiona Enter"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => handleAddTag(painInput, painPoints, setPainPoints, setPainInput)}>
                +
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {painPoints.map((p, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {p}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(i, painPoints, setPainPoints)} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Motivations */}
          <div>
            <Label>Motivaciones</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={motivationInput}
                onChange={e => setMotivationInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(motivationInput, motivations, setMotivations, setMotivationInput); } }}
                placeholder="Escribe y presiona Enter"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => handleAddTag(motivationInput, motivations, setMotivations, setMotivationInput)}>
                +
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {motivations.map((m, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {m}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(i, motivations, setMotivations)} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Objections */}
          <div>
            <Label>Objeciones</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={objectionInput}
                onChange={e => setObjectionInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(objectionInput, objections, setObjections, setObjectionInput); } }}
                placeholder="Escribe y presiona Enter"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => handleAddTag(objectionInput, objections, setObjections, setObjectionInput)}>
                +
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {objections.map((o, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {o}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(i, objections, setObjections)} />
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
