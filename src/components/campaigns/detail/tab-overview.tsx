'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { DailyMetric } from '@/types';

interface TabOverviewProps {
  timeSeries: DailyMetric[];
}

export function TabOverview({ timeSeries }: TabOverviewProps) {
  const formatDate = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tendencia diaria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip
                labelFormatter={(label) => formatDate(String(label))}
                formatter={(value, name) => {
                  const v = Number(value);
                  if (name === 'spend') return [`$${v.toFixed(2)}`, 'Inversión'];
                  if (name === 'clicks') return [v.toLocaleString(), 'Clicks'];
                  if (name === 'impressions') return [v.toLocaleString(), 'Impresiones'];
                  if (name === 'conversions') return [v.toLocaleString(), 'Conversiones'];
                  return [v, String(name)];
                }}
              />
              <Legend
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    spend: 'Inversión', clicks: 'Clicks',
                    impressions: 'Impresiones', conversions: 'Conversiones',
                  };
                  return labels[value] || value;
                }}
              />
              <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="#9333ea" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="conversions" stroke="#ea580c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
