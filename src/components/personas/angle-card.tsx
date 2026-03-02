'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Plus, X } from 'lucide-react';
import type { SalesAngle, BuyerPersona } from '@/types';

interface AngleCardProps {
  angle: SalesAngle;
  personas: BuyerPersona[];
  onEdit?: (angle: SalesAngle) => void;
  onDelete?: (id: string) => void;
  suggestion?: boolean;
  onAdopt?: (angle: SalesAngle) => void;
  onDismiss?: (id: string) => void;
}

export function AngleCard({ angle, personas, onEdit, onDelete, suggestion, onAdopt, onDismiss }: AngleCardProps) {
  const linkedPersona = angle.target_persona_id
    ? personas.find(p => p.id === angle.target_persona_id)
    : null;

  return (
    <Card className={suggestion ? 'border-dashed border-primary/40 bg-primary/5' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{angle.name}</CardTitle>
          {suggestion ? (
            <div className="flex gap-1">
              <Button size="sm" onClick={() => onAdopt?.(angle)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => onDismiss?.(angle.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit?.(angle)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete?.(angle.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground font-medium">Hook: </span>
          <span className="italic">&quot;{angle.hook}&quot;</span>
        </div>
        <div>
          <span className="text-muted-foreground font-medium">Propuesta de valor: </span>
          <span>{angle.value_proposition}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{angle.emotional_trigger}</Badge>
          {linkedPersona && (
            <Badge variant="secondary">{linkedPersona.name}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
