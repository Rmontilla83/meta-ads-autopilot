'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { DailyMetric } from '@/types';

const METRICS = [
  { key: 'spend', label: 'Inversión ($)', color: '#2563eb' },
  { key: 'clicks', label: 'Clicks', color: '#16a34a' },
  { key: 'impressions', label: 'Impresiones', color: '#9333ea' },
  { key: 'conversions', label: 'Conversiones', color: '#ea580c' },
] as const;

interface MetricsChartProps {
  data: DailyMetric[];
  dateRange: string;
  onDateRangeChange: (range: string) => void;
}

export function MetricsChart({ data, dateRange, onDateRangeChange }: MetricsChartProps) {
  const [activeLines, setActiveLines] = useState<Set<string>>(new Set(['spend', 'clicks']));

  const toggleLine = (key: string) => {
    setActiveLines(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const formatDate = (date: string) => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Métricas</CardTitle>
        <div className="flex gap-1">
          {['7d', '14d', '30d'].map(range => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => onDateRangeChange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {METRICS.map(m => (
            <Button
              key={m.key}
              variant={activeLines.has(m.key) ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
              style={activeLines.has(m.key) ? { backgroundColor: m.color, borderColor: m.color } : {}}
              onClick={() => toggleLine(m.key)}
            >
              {m.label}
            </Button>
          ))}
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <YAxis className="text-xs" tick={{ fontSize: 11 }} />
              <Tooltip
                labelFormatter={(label) => formatDate(String(label))}
                formatter={(value, name) => {
                  const v = Number(value);
                  const n = String(name);
                  const metric = METRICS.find(m => m.key === n);
                  if (n === 'spend') return [`$${v.toFixed(2)}`, metric?.label || n];
                  return [v.toLocaleString(), metric?.label || n];
                }}
              />
              <Legend />
              {METRICS.map(m => (
                activeLines.has(m.key) && (
                  <Line
                    key={m.key}
                    type="monotone"
                    dataKey={m.key}
                    stroke={m.color}
                    strokeWidth={2}
                    dot={false}
                    name={m.key}
                  />
                )
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
