'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Loader2 } from 'lucide-react';

interface ReportConfigFormProps {
  onGenerate: (config: ReportConfig) => void;
  loading: boolean;
}

export interface ReportConfig {
  days: number;
  includeAI: boolean;
  sections: {
    kpis: boolean;
    timeSeries: boolean;
    breakdowns: boolean;
    aiAnalysis: boolean;
  };
}

export function ReportConfigForm({ onGenerate, loading }: ReportConfigFormProps) {
  const [days, setDays] = useState<string>('30');
  const [includeAI, setIncludeAI] = useState(true);
  const [sections, setSections] = useState({
    kpis: true,
    timeSeries: true,
    breakdowns: true,
    aiAnalysis: true,
  });

  const handleGenerate = () => {
    onGenerate({
      days: parseInt(days),
      includeAI: includeAI && sections.aiAnalysis,
      sections,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Configurar reporte
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Período</Label>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="14">Últimos 14 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Secciones del reporte</Label>
          {[
            { key: 'kpis' as const, label: 'KPIs principales' },
            { key: 'timeSeries' as const, label: 'Gráfico temporal' },
            { key: 'breakdowns' as const, label: 'Desglose de audiencia' },
            { key: 'aiAnalysis' as const, label: 'Análisis IA' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <Switch
                checked={sections[key]}
                onCheckedChange={(v) => setSections(prev => ({ ...prev, [key]: v }))}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm font-medium">Incluir análisis IA</span>
          <Switch checked={includeAI} onCheckedChange={setIncludeAI} />
        </div>

        <Button className="w-full" onClick={handleGenerate} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            'Generar reporte'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
