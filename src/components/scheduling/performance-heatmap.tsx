'use client';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PerformanceHeatmapProps {
  heatmap: number[][];
  onCellClick?: (day: number, hour: number) => void;
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const DAY_FULL_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-green-400';
  if (score >= 45) return 'bg-yellow-400';
  if (score >= 30) return 'bg-orange-400';
  if (score >= 15) return 'bg-red-400';
  return 'bg-red-500';
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return 'text-green-50';
  if (score >= 60) return 'text-green-50';
  if (score >= 45) return 'text-yellow-900';
  if (score >= 30) return 'text-orange-50';
  if (score >= 15) return 'text-red-50';
  return 'text-red-50';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Bueno';
  if (score >= 45) return 'Regular';
  if (score >= 30) return 'Bajo';
  if (score >= 15) return 'Malo';
  return 'Muy malo';
}

export function PerformanceHeatmap({ heatmap, onCellClick }: PerformanceHeatmapProps) {
  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Rendimiento por hora y dia de la semana</span>
        <div className="flex items-center gap-1">
          <span>Bajo</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <div className="w-3 h-3 rounded-sm bg-red-400" />
            <div className="w-3 h-3 rounded-sm bg-orange-400" />
            <div className="w-3 h-3 rounded-sm bg-yellow-400" />
            <div className="w-3 h-3 rounded-sm bg-green-400" />
            <div className="w-3 h-3 rounded-sm bg-green-500" />
          </div>
          <span>Alto</span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Hour labels */}
          <div className="flex">
            <div className="w-10 shrink-0" />
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="flex-1 text-center text-[10px] text-muted-foreground font-mono"
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {heatmap.map((dayScores, d) => (
            <div key={d} className="flex items-center gap-0.5 mb-0.5">
              <div className="w-10 shrink-0 text-xs text-muted-foreground font-medium text-right pr-1">
                {DAY_LABELS[d]}
              </div>
              {dayScores.map((score, h) => (
                <Tooltip key={`${d}-${h}`}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'flex-1 aspect-square min-h-[20px] max-h-[28px] rounded-sm transition-all',
                        getScoreColor(score),
                        onCellClick && 'hover:ring-2 hover:ring-white/50 cursor-pointer',
                        !onCellClick && 'cursor-default'
                      )}
                      onClick={() => onCellClick?.(d, h)}
                    >
                      <span className={cn('text-[8px] font-mono', getScoreTextColor(score))}>
                        {score > 0 ? score : ''}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-semibold">{DAY_FULL_LABELS[d]} - {h}:00 a {h + 1}:00</p>
                    <p>Puntuacion: {score}/100 ({getScoreLabel(score)})</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
