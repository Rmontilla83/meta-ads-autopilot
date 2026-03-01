'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { BreakdownEntry } from '@/types';

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea'];

const DEVICE_LABELS: Record<string, string> = {
  mobile_app: 'Móvil (App)',
  mobile_web: 'Móvil (Web)',
  desktop: 'Escritorio',
  tablet: 'Tablet',
};

interface TabDevicesProps {
  data: BreakdownEntry[];
}

export function TabDevices({ data }: TabDevicesProps) {
  const labeledData = data.map(d => ({
    ...d,
    label: DEVICE_LABELS[d.label] || d.label,
  }));

  if (labeledData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">Sin datos de dispositivos disponibles</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribución por dispositivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-[250px] w-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={labeledData}
                    dataKey="value"
                    nameKey="label"
                    cx="50%" cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                  >
                    {labeledData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Impresiones']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {labeledData.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-sm">{entry.label}</span>
                  <span className="text-sm text-muted-foreground ml-auto">{entry.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle por dispositivo</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dispositivo</TableHead>
                <TableHead className="text-right">Impresiones</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labeledData.map((entry, i) => (
                <TableRow key={i}>
                  <TableCell>{entry.label}</TableCell>
                  <TableCell className="text-right">{entry.value.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{entry.percentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
