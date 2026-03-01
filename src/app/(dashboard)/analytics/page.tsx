'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analíticas</h1>
        <p className="text-muted-foreground mt-1">
          Visualiza el rendimiento de tus campañas.
        </p>
      </div>
      <Card>
        <CardHeader className="text-center py-12">
          <div className="flex justify-center mb-4">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle>Próximamente</CardTitle>
          <CardDescription>
            Las analíticas avanzadas estarán disponibles en la siguiente fase.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
