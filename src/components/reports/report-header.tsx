'use client';

import { Zap } from 'lucide-react';

interface ReportHeaderProps {
  campaignName: string;
  dateRange: string;
  generatedAt: string;
}

export function ReportHeader({ campaignName, dateRange, generatedAt }: ReportHeaderProps) {
  return (
    <div className="bg-primary/5 border rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">MetaAds Autopilot</span>
        </div>
        <span className="text-sm text-muted-foreground">
          Generado: {new Date(generatedAt).toLocaleDateString('es-MX', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </span>
      </div>
      <h1 className="text-2xl font-bold mt-4">{campaignName}</h1>
      <p className="text-muted-foreground">Reporte de rendimiento — {dateRange}</p>
    </div>
  );
}
