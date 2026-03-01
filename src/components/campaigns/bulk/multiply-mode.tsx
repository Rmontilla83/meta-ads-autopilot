'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import type { Campaign } from '@/types';
import type { GeneratedCampaign } from '@/lib/gemini/types';

interface MultiplyModeProps {
  onGenerate: (campaigns: GeneratedCampaign[]) => void;
}

export function MultiplyMode({ onGenerate }: MultiplyModeProps) {
  const { user } = useUser();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [copies, setCopies] = useState('3');
  const [budgetVariation, setBudgetVariation] = useState('10');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchCampaigns = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setCampaigns(data || []);
    };
    fetchCampaigns();
  }, [user]);

  const handleMultiply = () => {
    const source = campaigns.find(c => c.id === selectedId);
    if (!source?.campaign_data) return;

    setLoading(true);
    const sourceData = source.campaign_data as unknown as GeneratedCampaign;
    const count = parseInt(copies) || 3;
    const variation = parseFloat(budgetVariation) || 10;

    const results: GeneratedCampaign[] = [];
    for (let i = 0; i < count; i++) {
      const multiplier = 1 + ((i - Math.floor(count / 2)) * variation) / 100;
      const newBudget = Math.max(5, Math.round(sourceData.campaign.daily_budget * multiplier));

      results.push({
        ...sourceData,
        campaign: {
          ...sourceData.campaign,
          name: `${sourceData.campaign.name} — Var. ${i + 1}`,
          daily_budget: newBudget,
        },
        ad_sets: sourceData.ad_sets.map(as => ({ ...as })),
        ads: sourceData.ads.map(ad => ({ ...ad })),
      });
    }

    onGenerate(results);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Campaña base</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una campaña" />
          </SelectTrigger>
          <SelectContent>
            {campaigns.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cantidad de copias</Label>
          <Input
            type="number"
            value={copies}
            onChange={(e) => setCopies(e.target.value)}
            min={1}
            max={10}
          />
        </div>
        <div className="space-y-2">
          <Label>Variación de presupuesto (%)</Label>
          <Input
            type="number"
            value={budgetVariation}
            onChange={(e) => setBudgetVariation(e.target.value)}
            min={0}
            max={100}
          />
        </div>
      </div>

      <Button onClick={handleMultiply} disabled={!selectedId || loading} className="w-full">
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Generar variaciones
      </Button>
    </div>
  );
}
