'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp, Edit3, Check, X } from 'lucide-react';

interface FunnelAd {
  name: string;
  primary_text: string;
  headline: string;
  description: string;
  call_to_action: string;
  image_prompt?: string;
}

interface FunnelStageData {
  campaign_name: string;
  objective: string;
  optimization_goal: string;
  targeting: {
    age_min: number;
    age_max: number;
    genders: number[];
    geo_locations: {
      countries?: string[];
      cities?: Array<{ key: string; name: string }>;
      regions?: Array<{ key: string; name: string }>;
    };
    interests?: Array<{ id: string; name: string }>;
    custom_audiences?: string[];
  };
  placements: string[];
  ads: FunnelAd[];
  budget_percentage: number;
}

interface FunnelStageCardProps {
  stage: 'tofu' | 'mofu' | 'bofu';
  data: FunnelStageData;
  onEdit?: (data: FunnelStageData) => void;
}

const STAGE_CONFIG = {
  tofu: {
    label: 'TOFU',
    fullLabel: 'Top of Funnel',
    description: 'Conocimiento y alcance',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    headerColor: 'border-l-blue-500',
  },
  mofu: {
    label: 'MOFU',
    fullLabel: 'Middle of Funnel',
    description: 'Consideracion y engagement',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    headerColor: 'border-l-amber-500',
  },
  bofu: {
    label: 'BOFU',
    fullLabel: 'Bottom of Funnel',
    description: 'Conversion y ventas',
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    headerColor: 'border-l-green-500',
  },
};

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_AWARENESS: 'Conocimiento',
  OUTCOME_TRAFFIC: 'Trafico',
  OUTCOME_ENGAGEMENT: 'Interaccion',
  OUTCOME_LEADS: 'Leads',
  OUTCOME_SALES: 'Ventas',
};

const GENDER_LABELS: Record<number, string> = {
  0: 'Todos',
  1: 'Masculino',
  2: 'Femenino',
};

export function FunnelStageCard({ stage, data, onEdit }: FunnelStageCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(data);
  const config = STAGE_CONFIG[stage];

  const handleSave = () => {
    onEdit?.(editData);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditData(data);
    setEditing(false);
  };

  const geoDescription = () => {
    const geo = data.targeting.geo_locations;
    const parts: string[] = [];
    if (geo.countries?.length) parts.push(geo.countries.join(', '));
    if (geo.cities?.length) parts.push(geo.cities.map(c => c.name).join(', '));
    if (geo.regions?.length) parts.push(geo.regions.map(r => r.name).join(', '));
    return parts.join(', ') || 'Sin definir';
  };

  const interestsDescription = () => {
    return data.targeting.interests?.map(i => i.name).join(', ') || 'Audiencia amplia';
  };

  return (
    <Card className={`border-l-4 ${config.headerColor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
            <div>
              <CardTitle className="text-base">
                {editing ? (
                  <Input
                    value={editData.campaign_name}
                    onChange={(e) => setEditData({ ...editData, campaign_name: e.target.value })}
                    className="h-8 text-sm"
                  />
                ) : (
                  data.campaign_name
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {config.fullLabel} - {config.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {data.budget_percentage}% presupuesto
            </Badge>
            <Badge variant="outline" className="text-xs">
              {OBJECTIVE_LABELS[data.objective] || data.objective}
            </Badge>
            {onEdit && !editing && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            )}
            {editing && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500" onClick={handleSave}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={handleCancel}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Summary row (always visible) */}
      <CardContent className="pt-0 pb-3">
        <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Ubicacion: </span>
            {geoDescription()}
          </div>
          <div>
            <span className="font-medium text-foreground">Edad: </span>
            {data.targeting.age_min}-{data.targeting.age_max} |{' '}
            {data.targeting.genders.map(g => GENDER_LABELS[g] || 'Todos').join(', ')}
          </div>
          <div>
            <span className="font-medium text-foreground">Anuncios: </span>
            {data.ads.length}
          </div>
        </div>
      </CardContent>

      {/* Expanded content */}
      {expanded && (
        <CardContent className="pt-0 border-t">
          <div className="space-y-4 mt-4">
            {/* Targeting details */}
            <div>
              <h4 className="text-sm font-medium mb-2">Segmentacion</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded p-2">
                  <span className="text-muted-foreground">Intereses: </span>
                  {interestsDescription()}
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <span className="text-muted-foreground">Placements: </span>
                  {data.placements.join(', ')}
                </div>
                {data.targeting.custom_audiences?.length ? (
                  <div className="bg-muted/50 rounded p-2 col-span-2">
                    <span className="text-muted-foreground">Audiencias personalizadas: </span>
                    {data.targeting.custom_audiences.length} audiencia(s)
                  </div>
                ) : null}
              </div>
            </div>

            {/* Ads */}
            <div>
              <h4 className="text-sm font-medium mb-2">Anuncios ({data.ads.length})</h4>
              <div className="space-y-3">
                {data.ads.map((ad, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{ad.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {ad.call_to_action.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    {editing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editData.ads[i]?.primary_text || ''}
                          onChange={(e) => {
                            const newAds = [...editData.ads];
                            newAds[i] = { ...newAds[i], primary_text: e.target.value };
                            setEditData({ ...editData, ads: newAds });
                          }}
                          className="text-xs min-h-[60px]"
                          placeholder="Texto principal"
                        />
                        <Input
                          value={editData.ads[i]?.headline || ''}
                          onChange={(e) => {
                            const newAds = [...editData.ads];
                            newAds[i] = { ...newAds[i], headline: e.target.value };
                            setEditData({ ...editData, ads: newAds });
                          }}
                          className="text-xs h-8"
                          placeholder="Titular"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">{ad.primary_text}</p>
                        <p className="text-xs font-medium">{ad.headline}</p>
                        {ad.description && (
                          <p className="text-xs text-muted-foreground">{ad.description}</p>
                        )}
                      </>
                    )}
                    {ad.image_prompt && (
                      <div className="text-xs bg-muted/50 rounded p-2 mt-1">
                        <span className="text-muted-foreground">Imagen sugerida: </span>
                        {ad.image_prompt}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
