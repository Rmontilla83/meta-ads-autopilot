'use client';

import { ReportHeader } from './report-header';
import { ReportKPIs } from './report-kpis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CampaignAnalytics } from '@/lib/analytics/campaign-data';
import type { ReportAnalysisOutput } from '@/lib/gemini/validators';

interface WebReportProps {
  data: CampaignAnalytics & {
    aiAnalysis?: ReportAnalysisOutput | null;
    reportMeta: {
      generatedAt: string;
      days: number;
      includeAI: boolean;
    };
  };
  sections: {
    kpis: boolean;
    timeSeries: boolean;
    breakdowns: boolean;
    aiAnalysis: boolean;
  };
}

const DAYS_LABEL: Record<number, string> = {
  7: 'Últimos 7 días',
  14: 'Últimos 14 días',
  30: 'Últimos 30 días',
};

const RATING_COLORS: Record<string, string> = {
  Excelente: 'bg-green-500/10 text-green-600 border-green-500/20',
  Bueno: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Regular: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Bajo: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

export function WebReport({ data, sections }: WebReportProps) {
  const campaign = data.campaign as { name?: string; objective?: string };

  return (
    <div className="space-y-6 print:space-y-4" id="web-report">
      <ReportHeader
        campaignName={campaign.name || 'Campaña'}
        dateRange={DAYS_LABEL[data.reportMeta.days] || `Últimos ${data.reportMeta.days} días`}
        generatedAt={data.reportMeta.generatedAt}
      />

      {sections.kpis && <ReportKPIs kpis={data.kpis} />}

      {sections.timeSeries && data.timeSeries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento diario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Impresiones</TableHead>
                    <TableHead className="text-right">Clics</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Conv.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.timeSeries.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>
                        {new Date(day.date + 'T12:00:00').toLocaleDateString('es-MX', {
                          day: 'numeric', month: 'short',
                        })}
                      </TableCell>
                      <TableCell className="text-right">{day.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{day.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${day.spend}</TableCell>
                      <TableCell className="text-right">{day.ctr}%</TableCell>
                      <TableCell className="text-right">{day.conversions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {sections.breakdowns && (
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(data.breakdowns).map(([key, entries]) => {
            const labels: Record<string, string> = {
              age: 'Edad',
              gender: 'Género',
              placement: 'Ubicación',
              device: 'Dispositivo',
            };
            if (!entries.length) return null;
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-base">Por {labels[key] || key}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {entries.slice(0, 6).map((entry) => (
                      <div key={entry.label} className="flex items-center justify-between text-sm">
                        <span>{entry.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary rounded-full h-2"
                              style={{ width: `${Math.min(entry.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground w-12 text-right">
                            {entry.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {sections.aiAnalysis && data.aiAnalysis && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Análisis IA</CardTitle>
              <Badge className={RATING_COLORS[data.aiAnalysis.overall_rating] || ''}>
                {data.aiAnalysis.overall_rating}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Resumen ejecutivo</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {data.aiAnalysis.executive_summary}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2 text-green-600">Fortalezas</h4>
                <ul className="text-sm space-y-1">
                  {data.aiAnalysis.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-green-500 shrink-0">+</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-red-600">Áreas de mejora</h4>
                <ul className="text-sm space-y-1">
                  {data.aiAnalysis.weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-red-500 shrink-0">-</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Recomendaciones</h4>
              <div className="space-y-2">
                {data.aiAnalysis.recommendations.map((rec, i) => (
                  <div key={i} className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{rec.action}</span>
                      <Badge variant="outline" className="text-xs">
                        {PRIORITY_LABELS[rec.priority] || rec.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{rec.expected_impact}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary/5 rounded-lg p-4">
              <p className="text-sm font-medium">{data.aiAnalysis.conclusion}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
