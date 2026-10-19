import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { formatMonthDisplay, formatMonthKey } from '../domain/dateUtils';

interface Props {
  currentMonthKey: string;
  onChangeMonth: (newMonthKey: string) => void;
}

export const MonthPicker: React.FC<Props> = ({ currentMonthKey, onChangeMonth }) => {
  const [yearStr, monthStr] = currentMonthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  const handlePrev = () => {
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    onChangeMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNext = () => {
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    onChangeMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleToday = () => {
    onChangeMonth(formatMonthKey(new Date()));
  };

  const isCurrentMonth = currentMonthKey === formatMonthKey(new Date());

  return (
    <div className="flex items-center justify-between bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs mb-4">
      <button
        onClick={handlePrev}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all"
        title="Previous Month"
        aria-label="Previous Month"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-800 text-base">
          {formatMonthDisplay(currentMonthKey)}
        </span>
        {!isCurrentMonth && (
          <button
            onClick={handleToday}
            className="text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors"
          >
            Today
          </button>
        )}
      </div>

      <button
        onClick={handleNext}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all"
        title="Next Month"
        aria-label="Next Month"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};
