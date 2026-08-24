import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AvailabilityBlock } from '@/lib/types';
import { isDateBlocked, parseLocalDate } from '@/lib/booking';

export interface AvailabilityCalendarProps {
  blocks?: AvailabilityBlock[];
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  onSelectDate?: (date: Date) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function parseToDate(val?: Date | string | null): Date | null {
  if (!val) return null;
  if (val instanceof Date) return parseLocalDate(val);
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parseLocalDate(parsed);
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function AvailabilityCalendar({
  blocks = [],
  startDate,
  endDate,
  onSelectDate,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const parsedStart = parseToDate(startDate);
  const parsedEnd = parseToDate(endDate);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = parseLocalDate(new Date());

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const days: (Date | null)[] = [];

  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 select-none">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-stone-800 text-sm">
          {MONTH_NAMES[month]} {year}
        </h4>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-[11px] font-semibold text-stone-400 py-1">
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="h-9" />;
          }

          const isPast = date < today;
          const blocked = isDateBlocked(date, blocks);
          const isDisabled = isPast || blocked;

          const isStart = parsedStart ? isSameDay(date, parsedStart) : false;
          const isEnd = parsedEnd ? isSameDay(date, parsedEnd) : false;

          const isInConfirmedRange =
            parsedStart && parsedEnd && date > parsedStart && date < parsedEnd;

          const isHoverRange =
            parsedStart &&
            !parsedEnd &&
            hoveredDate &&
            hoveredDate > parsedStart &&
            date > parsedStart &&
            date <= hoveredDate;

          let btnClass = "h-9 w-full rounded-lg text-xs font-medium transition-all flex items-center justify-center ";

          if (blocked) {
            btnClass += "bg-red-50 text-red-400 line-through cursor-not-allowed ";
          } else if (isPast) {
            btnClass += "text-stone-300 cursor-not-allowed ";
          } else if (isStart) {
            btnClass += "bg-emerald-600 text-white font-bold shadow-sm rounded-r-none ";
          } else if (isEnd) {
            btnClass += "bg-emerald-600 text-white font-bold shadow-sm rounded-l-none ";
          } else if (isInConfirmedRange) {
            btnClass += "bg-emerald-100 text-emerald-900 rounded-none font-medium ";
          } else if (isHoverRange) {
            btnClass += "bg-emerald-50 text-emerald-800 rounded-none ";
          } else {
            btnClass += "text-stone-700 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer ";
          }

          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={isDisabled}
              onMouseEnter={() => !isDisabled && setHoveredDate(date)}
              onMouseLeave={() => setHoveredDate(null)}
              onClick={() => onSelectDate && onSelectDate(date)}
              className={btnClass}
              title={
                blocked
                  ? 'Data indisponível / já reservada'
                  : isPast
                  ? 'Data passada'
                  : `${date.getDate()} de ${MONTH_NAMES[month]}`
              }
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AvailabilityCalendar;