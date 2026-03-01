'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { BreakdownEntry } from '@/types';

const GENDER_COLORS = ['#2563eb', '#ec4899', '#8b5cf6'];
const GENDER_LABELS: Record<string, string> = {
  male: 'Masculino',
  female: 'Femenino',
  unknown: 'Sin especificar',
};

interface TabAudienceProps {
  ageBreakdown: BreakdownEntry[];
  genderBreakdown: BreakdownEntry[];
}

export function TabAudience({ ageBreakdown, genderBreakdown }: TabAudienceProps) {
  const genderData = genderBreakdown.map(g => ({
    ...g,
    label: GENDER_LABELS[g.label] || g.label,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Age breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por edad</CardTitle>
        </CardHeader>
        <CardContent>
          {ageBreakdown.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [Number(value).toLocaleString(), 'Impresiones']}
                  />
                  <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos disponibles</p>
          )}
        </CardContent>
      </Card>

      {/* Gender breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por género</CardTitle>
        </CardHeader>
        <CardContent>
          {genderData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="h-[200px] w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%" cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                    >
                      {genderData.map((_, i) => (
                        <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Impresiones']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1">
                {genderData.map((g, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: GENDER_COLORS[i % GENDER_COLORS.length] }}
                    />
                    <span className="text-sm">{g.label}</span>
                    <span className="text-sm text-muted-foreground ml-auto">{g.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos disponibles</p>
          )}
        </CardContent>
      </Card>

      {/* Segments table */}
      {ageBreakdown.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Detalle por segmento de edad</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rango de edad</TableHead>
                  <TableHead className="text-right">Impresiones</TableHead>
                  <TableHead className="text-right">% del total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ageBreakdown.map((entry, i) => (
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
      )}
    </div>
  );
}
