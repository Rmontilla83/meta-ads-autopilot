'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, AlertTriangle, Heart, ShieldAlert, Plus, X } from 'lucide-react';
import type { BuyerPersona } from '@/types';

interface PersonaCardProps {
  persona: BuyerPersona;
  onEdit?: (persona: BuyerPersona) => void;
  onDelete?: (id: string) => void;
  suggestion?: boolean;
  onAdopt?: (persona: BuyerPersona) => void;
  onDismiss?: (id: string) => void;
}

export function PersonaCard({ persona, onEdit, onDelete, suggestion, onAdopt, onDismiss }: PersonaCardProps) {
  return (
    <Card className={suggestion ? 'border-dashed border-primary/40 bg-primary/5' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{persona.name}</CardTitle>
          {suggestion ? (
            <div className="flex gap-1">
              <Button size="sm" onClick={() => onAdopt?.(persona)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => onDismiss?.(persona.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit?.(persona)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete?.(persona.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{persona.description}</p>
        <Badge variant="secondary" className="w-fit text-xs">{persona.demographics}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="font-medium">Pain points</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            {persona.pain_points.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Heart className="h-3.5 w-3.5" />
            <span className="font-medium">Motivaciones</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            {persona.motivations.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span className="font-medium">Objeciones</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            {persona.objections.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
