'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingDown, Sun, Moon, Brain } from 'lucide-react';
import { countActiveHours } from '@/lib/scheduling/mapper';

interface ScheduleSummaryProps {
  schedule: boolean[][];
  expectedSavings?: number;
  reasoning?: string;
  bestHours?: string;
  worstHours?: string;
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

export function ScheduleSummary({
  schedule,
  expectedSavings,
  reasoning,
  bestHours,
  worstHours,
}: ScheduleSummaryProps) {
  const totalActive = countActiveHours(schedule);
  const totalPossible = 7 * 24; // 168 hours/week
  const activePercentage = Math.round((totalActive / totalPossible) * 100);
  const inactiveHours = totalPossible - totalActive;

  // Calculate active hours per day
  const perDayActive = schedule.map((daySlots, d) => ({
    day: DAY_LABELS[d],
    active: daySlots.filter(Boolean).length,
  }));

  // Find active time windows for summary display
  const getTimeWindows = (): string[] => {
    const windows: string[] = [];
    for (let d = 0; d < 7; d++) {
      let start: number | null = null;
      for (let h = 0; h < 24; h++) {
        if (schedule[d]?.[h] && start === null) {
          start = h;
        } else if (!schedule[d]?.[h] && start !== null) {
          windows.push(`${DAY_LABELS[d]} ${start}:00-${h}:00`);
          start = null;
        }
      }
      if (start !== null) {
        windows.push(`${DAY_LABELS[d]} ${start}:00-0:00`);
      }
    }
    return windows.slice(0, 6); // Show max 6 windows
  };

  const timeWindows = getTimeWindows();

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Clock className="h-3.5 w-3.5" />
              Horas activas
            </div>
            <p className="text-2xl font-bold">{totalActive}</p>
            <p className="text-xs text-muted-foreground">de {totalPossible} semanales</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Moon className="h-3.5 w-3.5" />
              Horas pausadas
            </div>
            <p className="text-2xl font-bold">{inactiveHours}</p>
            <p className="text-xs text-muted-foreground">{100 - activePercentage}% del tiempo</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Sun className="h-3.5 w-3.5" />
              Cobertura
            </div>
            <p className="text-2xl font-bold">{activePercentage}%</p>
            <p className="text-xs text-muted-foreground">del total semanal</p>
          </CardContent>
        </Card>

        {expectedSavings !== undefined && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingDown className="h-3.5 w-3.5" />
                Ahorro estimado
              </div>
              <p className="text-2xl font-bold text-green-500">{expectedSavings}%</p>
              <p className="text-xs text-muted-foreground">en gasto publicitario</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hours per day */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Horas activas por dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            {perDayActive.map(({ day, active }) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-zinc-800 rounded-sm overflow-hidden" style={{ height: '60px' }}>
                  <div
                    className="w-full bg-blue-500 rounded-sm transition-all"
                    style={{ height: `${(active / 24) * 100}%`, marginTop: `${((24 - active) / 24) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{day}</span>
                <span className="text-xs font-mono font-medium">{active}h</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time windows */}
      {timeWindows.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ventanas de tiempo activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {timeWindows.map((window, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {window}
                </Badge>
              ))}
              {timeWindows.length >= 6 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  +mas
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Reasoning */}
      {(reasoning || bestHours || worstHours) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-400" />
              Analisis de IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reasoning && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Razonamiento</p>
                <p className="text-sm leading-relaxed">{reasoning}</p>
              </div>
            )}
            {bestHours && (
              <div>
                <p className="text-xs font-medium text-green-400 mb-1">Mejores horarios</p>
                <p className="text-sm leading-relaxed">{bestHours}</p>
              </div>
            )}
            {worstHours && (
              <div>
                <p className="text-xs font-medium text-red-400 mb-1">Peores horarios</p>
                <p className="text-sm leading-relaxed">{worstHours}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
