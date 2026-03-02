'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckSquare, XSquare } from 'lucide-react';

interface ScheduleEditorProps {
  schedule: boolean[][];
  onChange: (schedule: boolean[][]) => void;
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const DAY_FULL_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export function ScheduleEditor({ schedule, onChange }: ScheduleEditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragModeRef = useRef<boolean | null>(null);

  const toggleCell = useCallback((day: number, hour: number) => {
    const newSchedule = schedule.map((row, d) =>
      row.map((val, h) => (d === day && h === hour ? !val : val))
    );
    onChange(newSchedule);
  }, [schedule, onChange]);

  const handleMouseDown = useCallback((day: number, hour: number) => {
    setIsDragging(true);
    // Set drag mode based on current cell state (if active, we deactivate; if inactive, we activate)
    dragModeRef.current = !schedule[day][hour];
    const newSchedule = schedule.map((row, d) =>
      row.map((val, h) => (d === day && h === hour ? dragModeRef.current! : val))
    );
    onChange(newSchedule);
  }, [schedule, onChange]);

  const handleMouseEnter = useCallback((day: number, hour: number) => {
    if (!isDragging || dragModeRef.current === null) return;
    const newSchedule = schedule.map((row, d) =>
      row.map((val, h) => (d === day && h === hour ? dragModeRef.current! : val))
    );
    onChange(newSchedule);
  }, [isDragging, schedule, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragModeRef.current = null;
  }, []);

  const selectAll = () => {
    const newSchedule = schedule.map(row => row.map(() => true));
    onChange(newSchedule);
  };

  const clearAll = () => {
    const newSchedule = schedule.map(row => row.map(() => false));
    onChange(newSchedule);
  };

  const selectWeekdays = () => {
    // Monday (1) to Friday (5) active, Saturday (6) and Sunday (0) inactive
    const newSchedule = schedule.map((row, d) =>
      row.map(() => d >= 1 && d <= 5)
    );
    onChange(newSchedule);
  };

  const selectPrimeTime = () => {
    // Prime time: 7-22h every day
    const newSchedule = schedule.map(row =>
      row.map((_, h) => h >= 7 && h <= 22)
    );
    onChange(newSchedule);
  };

  return (
    <div
      className="space-y-3"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={selectAll}>
          <CheckSquare className="h-3.5 w-3.5 mr-1" />
          Seleccionar todos
        </Button>
        <Button variant="outline" size="sm" onClick={clearAll}>
          <XSquare className="h-3.5 w-3.5 mr-1" />
          Limpiar
        </Button>
        <Button variant="outline" size="sm" onClick={selectWeekdays}>
          Lun-Vie
        </Button>
        <Button variant="outline" size="sm" onClick={selectPrimeTime}>
          Horario prime (7-22h)
        </Button>
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground">
        Haz clic o arrastra para activar/desactivar horas. Azul = activo, gris = pausado.
      </p>

      {/* Grid */}
      <div className="overflow-x-auto select-none">
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
          {schedule.map((daySlots, d) => (
            <div key={d} className="flex items-center gap-0.5 mb-0.5">
              <div className="w-10 shrink-0 text-xs text-muted-foreground font-medium text-right pr-1">
                {DAY_LABELS[d]}
              </div>
              {daySlots.map((isActive, h) => (
                <Tooltip key={`${d}-${h}`}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'flex-1 aspect-square min-h-[20px] max-h-[28px] rounded-sm transition-colors border',
                        isActive
                          ? 'bg-blue-500 border-blue-600 hover:bg-blue-400'
                          : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
                      )}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleMouseDown(d, h);
                      }}
                      onMouseEnter={() => handleMouseEnter(d, h)}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p>{DAY_FULL_LABELS[d]} - {h}:00 a {h + 1}:00</p>
                    <p>{isActive ? 'Activo' : 'Pausado'} (clic para cambiar)</p>
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
