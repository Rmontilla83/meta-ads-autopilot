'use client';

import { Plus, Trash2, ChevronDown, ChevronRight, Sparkles, Loader2, Check, X, Info } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { GeoSelector } from '@/components/campaigns/editor/geo-selector';
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
  {
    value: 'LOWEST_COST_WITHOUT_CAP',
    label: 'Costo más bajo',
    description: 'Meta busca obtener la mayor cantidad de resultados al menor costo posible. Ideal para maximizar volumen sin restricción de precio.',
    impact: 'El gasto puede variar día a día. Meta usará todo el presupuesto diario buscando las oportunidades más baratas.',
  },
  {
    value: 'LOWEST_COST_WITH_BID_CAP',
    label: 'Costo más bajo con límite',
    description: 'Similar a costo más bajo, pero estableces un tope máximo por puja. Meta no pujará más de ese monto por cada subasta.',
    impact: 'Puede que no se gaste todo el presupuesto si el límite es muy bajo. Útil para controlar el costo por resultado sin sorpresas.',
  },
  {
    value: 'COST_CAP',
    label: 'Límite de costo',
    description: 'Defines el costo promedio máximo por resultado. Meta intentará mantenerse cerca de ese objetivo a lo largo del tiempo.',
    impact: 'El gasto se ajusta para respetar el costo objetivo. Puede tardar más en gastar el presupuesto, pero mantiene costos predecibles.',
  },
];

interface SuggestedInterest {
  id: string;
  name: string;
  audience_size?: number;
}

export function TabAdSets({ data, onChange }: TabAdSetsProps) {
  const [expandedSets, setExpandedSets] = useState<Set<number>>(new Set([0]));
  const [suggestingFor, setSuggestingFor] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedInterest[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const fetchInterestSuggestions = async (adSetIndex: number) => {
    const adSet = data.ad_sets[adSetIndex];
    setSuggestingFor(adSetIndex);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    setSuggestError(null);

    try {
      const res = await fetch('/api/ai/suggest-interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: data.campaign.objective,
          existing_interests: adSet.targeting.interests?.map(i => i.name) || [],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al obtener sugerencias');
      }

      const result = await res.json();
      setSuggestions(result.interests || []);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : 'Error inesperado');
    }
  };

  const toggleSuggestion = (id: string) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelectedInterests = (adSetIndex: number) => {
    const adSet = data.ad_sets[adSetIndex];
    const newInterests = suggestions
      .filter(s => selectedSuggestions.has(s.id))
      .map(s => ({ id: s.id, name: s.name }));
    const existing = adSet.targeting.interests || [];
    const existingIds = new Set(existing.map(i => i.id));
    const deduped = newInterests.filter(i => !existingIds.has(i.id));

    updateAdSet(adSetIndex, {
      targeting: {
        ...adSet.targeting,
        interests: [...existing, ...deduped],
      },
    });
    setSuggestingFor(null);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
  };

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
      <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-1">
        <h3 className="text-sm font-semibold">Conjuntos de anuncios (Ad Sets)</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Los ad sets definen <strong>a quién</strong> se muestran tus anuncios. Aquí configuras la audiencia: países, ciudades, rango de edad, género e intereses de las personas que verás tu publicidad. También eliges dónde aparecerán (Feed, Stories, Reels) y cómo Meta optimizará la entrega. Puedes crear varios ad sets para probar diferentes audiencias y comparar resultados.
        </p>
      </div>

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

                  <GeoSelector
                    value={adSet.targeting.geo_locations}
                    onChange={(geo) => {
                      updateAdSet(index, {
                        targeting: {
                          ...adSet.targeting,
                          geo_locations: geo,
                        },
                      });
                    }}
                  />

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
                    <div className="flex items-center justify-between">
                      <Label>Intereses</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => fetchInterestSuggestions(index)}
                        disabled={suggestingFor !== null}
                      >
                        {suggestingFor === index ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Sugerencias IA
                      </Button>
                    </div>
                    {(adSet.targeting.interests?.length ?? 0) > 0 && (
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
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Input
                      placeholder="Agregar interés manual y presiona Enter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          e.preventDefault();
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

                    {/* AI Suggestions Panel */}
                    {suggestingFor === index && suggestions.length === 0 && !suggestError && (
                      <div className="flex items-center gap-2 py-3 justify-center text-sm text-muted-foreground border rounded-md">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generando sugerencias con IA...
                      </div>
                    )}
                    {suggestError && suggestingFor === index && (
                      <div className="text-sm text-destructive border border-destructive/20 rounded-md px-3 py-2">
                        {suggestError}
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 ml-2 text-xs"
                          onClick={() => { setSuggestError(null); setSuggestingFor(null); }}
                        >
                          Cerrar
                        </Button>
                      </div>
                    )}
                    {suggestingFor === index && suggestions.length > 0 && (
                      <div className="border rounded-md p-3 space-y-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">
                            {suggestions.length} intereses sugeridos — selecciona los que desees
                          </p>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => {
                                if (selectedSuggestions.size === suggestions.length) {
                                  setSelectedSuggestions(new Set());
                                } else {
                                  setSelectedSuggestions(new Set(suggestions.map(s => s.id)));
                                }
                              }}
                            >
                              {selectedSuggestions.size === suggestions.length ? 'Deseleccionar' : 'Seleccionar todos'}
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                          {suggestions.map(s => {
                            const checked = selectedSuggestions.has(s.id);
                            return (
                              <button
                                key={s.id}
                                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-left cursor-pointer transition-colors ${
                                  checked ? 'bg-primary/10 border border-primary/30' : 'bg-background border hover:bg-accent'
                                }`}
                                onClick={() => toggleSuggestion(s.id)}
                              >
                                <Checkbox checked={checked} className="pointer-events-none h-3.5 w-3.5" />
                                <span className="truncate">{s.name}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => { setSuggestingFor(null); setSuggestions([]); setSelectedSuggestions(new Set()); }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={selectedSuggestions.size === 0}
                            onClick={() => addSelectedInterests(index)}
                          >
                            <Check className="h-3 w-3" />
                            Agregar {selectedSuggestions.size > 0 ? `(${selectedSuggestions.size})` : ''}
                          </Button>
                        </div>
                      </div>
                    )}
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
                    {(() => {
                      const strategy = BID_STRATEGIES.find(b => b.value === adSet.bid_strategy);
                      if (!strategy) return null;
                      return (
                        <div className="rounded-md border bg-muted/40 px-3 py-2.5 space-y-1.5">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground">{strategy.description}</p>
                          </div>
                          <p className="text-xs font-medium text-foreground/80 pl-6">
                            Efecto en presupuesto: <span className="font-normal text-muted-foreground">{strategy.impact}</span>
                          </p>
                        </div>
                      );
                    })()}
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
