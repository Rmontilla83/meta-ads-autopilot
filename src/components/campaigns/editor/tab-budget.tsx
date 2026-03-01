'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import type { GeneratedCampaign } from '@/lib/gemini/types';

interface TabBudgetProps {
  data: GeneratedCampaign;
  onChange: (data: GeneratedCampaign) => void;
}

export function TabBudget({ data, onChange }: TabBudgetProps) {
  const updateBudget = (dailyBudget: number) => {
    onChange({
      ...data,
      campaign: { ...data.campaign, daily_budget: dailyBudget },
    });
  };

  const updateAdSetBudget = (index: number, percentage: number) => {
    const adSets = [...data.ad_sets];
    adSets[index] = { ...adSets[index], budget_percentage: percentage };
    onChange({ ...data, ad_sets: adSets });
  };

  const totalPercentage = data.ad_sets.reduce((sum, s) => sum + s.budget_percentage, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Presupuesto diario (USD)</Label>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">$</span>
          <Input
            type="number"
            min={1}
            value={data.campaign.daily_budget}
            onChange={(e) => updateBudget(Number(e.target.value) || 1)}
            className="w-32"
          />
          <span className="text-sm text-muted-foreground">/ día</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Mensual estimado: ${(data.campaign.daily_budget * 30).toFixed(2)} USD
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Distribución por ad set</Label>
          <span className={`text-xs font-medium ${totalPercentage === 100 ? 'text-green-600' : 'text-red-500'}`}>
            Total: {totalPercentage}%
          </span>
        </div>

        {data.ad_sets.map((adSet, index) => {
          const dailyAmount = (data.campaign.daily_budget * adSet.budget_percentage) / 100;

          return (
            <Card key={index}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{adSet.name}</span>
                  <span className="text-sm font-bold">${dailyAmount.toFixed(2)}/día</span>
                </div>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[adSet.budget_percentage]}
                    min={1}
                    max={100}
                    step={1}
                    onValueChange={([value]) => updateAdSetBudget(index, value)}
                    className="flex-1"
                  />
                  <span className="text-sm w-12 text-right">{adSet.budget_percentage}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Results estimate */}
      <div className="space-y-2">
        <Label>Resultados estimados</Label>
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Alcance diario</p>
              <p className="text-lg font-bold">
                {data.strategy.estimated_results.daily_reach_min.toLocaleString()}-
                {data.strategy.estimated_results.daily_reach_max.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Clics diarios</p>
              <p className="text-lg font-bold">
                {data.strategy.estimated_results.daily_clicks_min}-
                {data.strategy.estimated_results.daily_clicks_max}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
