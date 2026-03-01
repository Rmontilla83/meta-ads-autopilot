'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Eye, Users, MousePointer, DollarSign, Target,
  UserPlus, BarChart3, Coins, MonitorSmartphone,
} from 'lucide-react';

interface KpiData {
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  conversions: number;
  leads: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  frequency: number;
}

const KPI_CONFIG = [
  { key: 'impressions', label: 'Impresiones', icon: Eye, format: (v: number) => v.toLocaleString() },
  { key: 'reach', label: 'Alcance', icon: Users, format: (v: number) => v.toLocaleString() },
  { key: 'clicks', label: 'Clicks', icon: MousePointer, format: (v: number) => v.toLocaleString() },
  { key: 'ctr', label: 'CTR', icon: BarChart3, format: (v: number) => `${v.toFixed(2)}%` },
  { key: 'cpc', label: 'CPC', icon: Coins, format: (v: number) => `$${v.toFixed(2)}` },
  { key: 'spend', label: 'Inversión', icon: DollarSign, format: (v: number) => `$${v.toFixed(2)}` },
  { key: 'conversions', label: 'Conversiones', icon: Target, format: (v: number) => v.toLocaleString() },
  { key: 'cpa', label: 'CPA', icon: DollarSign, format: (v: number) => `$${v.toFixed(2)}` },
  { key: 'leads', label: 'Leads', icon: UserPlus, format: (v: number) => v.toLocaleString() },
  { key: 'frequency', label: 'Frecuencia', icon: MonitorSmartphone, format: (v: number) => v.toFixed(2) },
  { key: 'cpm', label: 'CPM', icon: Coins, format: (v: number) => `$${v.toFixed(2)}` },
] as const;

interface CampaignKpisProps {
  kpis: KpiData;
}

export function CampaignKpis({ kpis }: CampaignKpisProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {KPI_CONFIG.map(({ key, label, icon: Icon, format }) => (
        <Card key={key}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-lg font-bold">{format(kpis[key])}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
