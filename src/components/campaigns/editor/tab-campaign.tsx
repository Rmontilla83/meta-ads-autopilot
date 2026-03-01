'use client';

import { Eye, MousePointerClick, Megaphone, UserPlus, DollarSign, Target, Smartphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { GeneratedCampaign } from '@/lib/gemini/types';

interface TabCampaignProps {
  data: GeneratedCampaign;
  onChange: (data: GeneratedCampaign) => void;
}

const OBJECTIVES = [
  { value: 'OUTCOME_AWARENESS', label: 'Reconocimiento', icon: Eye },
  { value: 'OUTCOME_TRAFFIC', label: 'Tráfico', icon: MousePointerClick },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Interacción', icon: Megaphone },
  { value: 'OUTCOME_LEADS', label: 'Clientes potenciales', icon: UserPlus },
  { value: 'OUTCOME_SALES', label: 'Ventas', icon: DollarSign },
  { value: 'OUTCOME_APP_PROMOTION', label: 'Promoción de app', icon: Smartphone },
];

const SPECIAL_CATEGORIES = [
  { value: 'CREDIT', label: 'Crédito' },
  { value: 'EMPLOYMENT', label: 'Empleo' },
  { value: 'HOUSING', label: 'Vivienda' },
  { value: 'SOCIAL_ISSUES', label: 'Temas sociales' },
];

export function TabCampaign({ data, onChange }: TabCampaignProps) {
  const updateCampaign = (updates: Partial<GeneratedCampaign['campaign']>) => {
    onChange({
      ...data,
      campaign: { ...data.campaign, ...updates },
      strategy: {
        ...data.strategy,
        objective: updates.objective || data.strategy.objective,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="campaign-name">Nombre de la campaña</Label>
        <Input
          id="campaign-name"
          value={data.campaign.name}
          onChange={(e) => updateCampaign({ name: e.target.value })}
          placeholder="Ej: Campaña de tráfico - Marzo 2026"
        />
      </div>

      <div className="space-y-2">
        <Label>Objetivo de campaña</Label>
        <Select
          value={data.campaign.objective}
          onValueChange={(value) => updateCampaign({ objective: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un objetivo" />
          </SelectTrigger>
          <SelectContent>
            {OBJECTIVES.map((obj) => (
              <SelectItem key={obj.value} value={obj.value}>
                <div className="flex items-center gap-2">
                  <obj.icon className="h-4 w-4" />
                  {obj.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Categorías especiales de anuncios</Label>
        <p className="text-xs text-muted-foreground">
          Selecciona si tu anuncio trata sobre crédito, empleo, vivienda o temas sociales.
        </p>
        <div className="space-y-2">
          {SPECIAL_CATEGORIES.map((cat) => {
            const isSelected = data.campaign.special_ad_categories.includes(cat.value);
            return (
              <div key={cat.value} className="flex items-center justify-between">
                <Label htmlFor={`cat-${cat.value}`} className="text-sm font-normal">
                  {cat.label}
                </Label>
                <Switch
                  id={`cat-${cat.value}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    const categories = checked
                      ? [...data.campaign.special_ad_categories, cat.value]
                      : data.campaign.special_ad_categories.filter(c => c !== cat.value);
                    updateCampaign({ special_ad_categories: categories });
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
