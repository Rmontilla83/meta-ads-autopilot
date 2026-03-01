'use client';

import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { GeneratedCampaign, GeneratedAdSet } from '@/lib/gemini/types';

interface TabAdSetsProps {
  data: GeneratedCampaign;
  onChange: (data: GeneratedCampaign) => void;
}

const PLACEMENTS = [
  { value: 'feed', label: 'Feed' },
  { value: 'stories', label: 'Stories' },
  { value: 'reels', label: 'Reels' },
  { value: 'right_column', label: 'Columna derecha' },
  { value: 'search', label: 'Búsqueda' },
  { value: 'marketplace', label: 'Marketplace' },
];

const OPTIMIZATION_GOALS = [
  { value: 'LINK_CLICKS', label: 'Clics en enlaces' },
  { value: 'LANDING_PAGE_VIEWS', label: 'Vistas de página' },
  { value: 'IMPRESSIONS', label: 'Impresiones' },
  { value: 'REACH', label: 'Alcance' },
  { value: 'POST_ENGAGEMENT', label: 'Interacción' },
  { value: 'LEAD_GENERATION', label: 'Generación de leads' },
  { value: 'OFFSITE_CONVERSIONS', label: 'Conversiones' },
];

const BID_STRATEGIES = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Costo más bajo' },
  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Costo más bajo con límite' },
  { value: 'COST_CAP', label: 'Límite de costo' },
];

export function TabAdSets({ data, onChange }: TabAdSetsProps) {
  const [expandedSets, setExpandedSets] = useState<Set<number>>(new Set([0]));

  const toggleExpanded = (index: number) => {
    const next = new Set(expandedSets);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedSets(next);
  };

  const updateAdSet = (index: number, updates: Partial<GeneratedAdSet>) => {
    const adSets = [...data.ad_sets];
    adSets[index] = { ...adSets[index], ...updates };
    onChange({ ...data, ad_sets: adSets });
  };

  const addAdSet = () => {
    const newAdSet: GeneratedAdSet = {
      name: `Ad Set ${data.ad_sets.length + 1}`,
      targeting: {
        age_min: 18,
        age_max: 65,
        genders: [0],
        geo_locations: { countries: ['MX'] },
      },
      placements: ['feed', 'stories', 'reels'],
      budget_percentage: Math.floor(100 / (data.ad_sets.length + 1)),
      optimization_goal: 'LINK_CLICKS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    };
    onChange({ ...data, ad_sets: [...data.ad_sets, newAdSet] });
    setExpandedSets(prev => new Set(prev).add(data.ad_sets.length));
  };

  const removeAdSet = (index: number) => {
    if (data.ad_sets.length <= 1) return;
    const adSets = data.ad_sets.filter((_, i) => i !== index);
    onChange({ ...data, ad_sets: adSets });
  };

  return (
    <div className="space-y-4">
      {data.ad_sets.map((adSet, index) => {
        const isExpanded = expandedSets.has(index);

        return (
          <Card key={index}>
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => toggleExpanded(index)}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-medium text-sm">{adSet.name}</span>
                <Badge variant="outline" className="text-xs">{adSet.budget_percentage}%</Badge>
              </div>
              {data.ad_sets.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); removeAdSet(index); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>

            {isExpanded && (
              <CardContent className="pt-0 space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label>Nombre del ad set</Label>
                  <Input
                    value={adSet.name}
                    onChange={(e) => updateAdSet(index, { name: e.target.value })}
                  />
                </div>

                {/* Audience */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Audiencia</h4>

                  <div className="space-y-2">
                    <Label>Ubicaciones (países)</Label>
                    <Input
                      value={adSet.targeting.geo_locations.countries?.join(', ') || ''}
                      onChange={(e) => {
                        const countries = e.target.value.split(',').map(c => c.trim()).filter(Boolean);
                        updateAdSet(index, {
                          targeting: {
                            ...adSet.targeting,
                            geo_locations: { ...adSet.targeting.geo_locations, countries },
                          },
                        });
                      }}
                      placeholder="MX, CO, AR"
                    />
                    <p className="text-xs text-muted-foreground">Códigos de país ISO separados por coma</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Rango de edad: {adSet.targeting.age_min} - {adSet.targeting.age_max}</Label>
                    <div className="px-2">
                      <Slider
                        value={[adSet.targeting.age_min, adSet.targeting.age_max]}
                        min={18}
                        max={65}
                        step={1}
                        onValueChange={([min, max]) => {
                          updateAdSet(index, {
                            targeting: { ...adSet.targeting, age_min: min, age_max: max },
                          });
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Género</Label>
                    <Select
                      value={String(adSet.targeting.genders[0])}
                      onValueChange={(v) => {
                        updateAdSet(index, {
                          targeting: { ...adSet.targeting, genders: [Number(v)] },
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Todos</SelectItem>
                        <SelectItem value="1">Masculino</SelectItem>
                        <SelectItem value="2">Femenino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Intereses</Label>
                    <div className="flex flex-wrap gap-1">
                      {adSet.targeting.interests?.map((interest, ii) => (
                        <Badge key={ii} variant="secondary" className="text-xs">
                          {interest.name}
                          <button
                            className="ml-1 hover:text-destructive"
                            onClick={() => {
                              const interests = adSet.targeting.interests?.filter((_, j) => j !== ii);
                              updateAdSet(index, {
                                targeting: { ...adSet.targeting, interests },
                              });
                            }}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <Input
                      placeholder="Agregar interés y presiona Enter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          const newInterest = {
                            id: String(Date.now()),
                            name: e.currentTarget.value,
                          };
                          updateAdSet(index, {
                            targeting: {
                              ...adSet.targeting,
                              interests: [...(adSet.targeting.interests || []), newInterest],
                            },
                          });
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Placements */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Ubicaciones</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {PLACEMENTS.map((p) => (
                      <div key={p.value} className="flex items-center justify-between">
                        <Label className="text-sm font-normal">{p.label}</Label>
                        <Switch
                          checked={adSet.placements.includes(p.value)}
                          onCheckedChange={(checked) => {
                            const placements = checked
                              ? [...adSet.placements, p.value]
                              : adSet.placements.filter(pl => pl !== p.value);
                            updateAdSet(index, { placements });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optimization */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Optimización</h4>
                  <div className="space-y-2">
                    <Label>Objetivo de optimización</Label>
                    <Select
                      value={adSet.optimization_goal}
                      onValueChange={(v) => updateAdSet(index, { optimization_goal: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPTIMIZATION_GOALS.map((g) => (
                          <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estrategia de puja</Label>
                    <Select
                      value={adSet.bid_strategy}
                      onValueChange={(v) => updateAdSet(index, { bid_strategy: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BID_STRATEGIES.map((b) => (
                          <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      <Button variant="outline" onClick={addAdSet} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Agregar ad set
      </Button>
    </div>
  );
}
