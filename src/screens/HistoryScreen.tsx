import React, { useState } from 'react';
import { useDuty } from '../context/DutyContext';
import { MonthPicker } from '../components/MonthPicker';
import { DayDetailModal } from '../components/DayDetailModal';
import { DayDetailItem, DayStatus } from '../types';
import {
  formatMinutesToDuration,
  format12Hour,
  getTodayDateKey,
  parseDateKey,
  SHORT_WEEKDAYS
} from '../domain/dateUtils';
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Plus,
  Clock,
  AlertCircle,
  FileText
} from 'lucide-react';

export const HistoryScreen: React.FC = () => {
  const { currentMonthKey, setCurrentMonthKey, monthDays } = useDuty();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<string>('All');
  const [selectedDateForModal, setSelectedDateForModal] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [isNewEntry, setIsNewEntry] = useState<boolean>(false);

  const todayKey = getTodayDateKey();

  // Filter chips
  const filterOptions = ['All', 'Present', 'Absent', 'Leave', 'Incomplete', 'Overtime'];

  // Filter days
  const filteredDays = monthDays.filter((d) => {
    if (filter === 'All') return true;
    if (filter === 'Overtime') {
      return d.calculation.overtimeMin > 0;
    }
    return d.calculation.status === filter;
  });

  const getStatusColor = (status: DayStatus, hasOvertime: boolean) => {
    switch (status) {
      case 'Present':
        return hasOvertime
          ? { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500' }
          : { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-600' };
      case 'Absent':
        return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-600' };
      case 'Leave':
        return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300', dot: 'bg-purple-600' };
      case 'Holiday':
      case 'Weekly Off':
        return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', dot: 'bg-slate-400' };
      case 'Incomplete':
      case 'In Progress':
        return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-500' };
      default:
        return { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200', dot: 'bg-slate-300' };
    }
  };

  const handleDayClick = (dateKey: string) => {
    if (dateKey > todayKey) return;
    setSelectedDateForModal(dateKey);
    setIsNewEntry(false);
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedDateForModal(todayKey);
    setIsNewEntry(true);
    setModalOpen(true);
  };

  // Calendar Grid Preparation
  const firstDayOfMonth = parseDateKey(`${currentMonthKey}-01`);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      {/* Month Selector */}
      <MonthPicker currentMonthKey={currentMonthKey} onChangeMonth={setCurrentMonthKey} />

      {/* View Switcher & Filters */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListIcon className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'calendar'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendar</span>
          </button>
        </div>

        <button
          onClick={handleAddNew}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Record</span>
        </button>
      </div>

      {/* Filter Chips Horizontal Scroll */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {filterOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setFilter(opt)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filter === opt
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-2.5">
          {filteredDays.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-500">
              <CalendarIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">No records match filter</p>
            </div>
          ) : (
            filteredDays.map((item) => {
              const { date, weekday, dayOfMonth, record, mark, calculation } = item;
              const hasOvertime = calculation.overtimeMin > 0;
              const color = getStatusColor(calculation.status, hasOvertime);
              const isFuture = date > todayKey;

              return (
                <div
                  key={date}
                  onClick={() => !isFuture && handleDayClick(date)}
                  className={`bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs transition-all ${
                    isFuture
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:border-blue-300 hover:shadow-xs active:scale-[0.99] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Date & Weekday */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-800 font-bold">
                        <span className="text-sm leading-none">{dayOfMonth}</span>
                        <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">
                          {weekday}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md border ${color.bg} ${color.text} ${color.border}`}
                          >
                            {calculation.status}
                          </span>
                          {record?.source && (
                            <span className="text-[10px] font-semibold text-slate-400">
                              {record.source}
                            </span>
                          )}
                          {calculation.lateMin > 0 && calculation.status === 'Present' && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              Late {calculation.lateMin}m
                            </span>
                          )}
                        </div>

                        {/* In - Out timestamps */}
                        <div className="text-xs text-slate-600 font-medium mt-1">
                          {record?.inAt ? (
                            <span>
                              {format12Hour(record.inAt.toDate())}
                              {record.outAt ? ` → ${format12Hour(record.outAt.toDate())}` : ' → Incomplete'}
                            </span>
                          ) : (
                            <span className="text-slate-400">No punch record</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Hours breakdown */}
                    <div className="text-right">
                      {calculation.totalMin > 0 ? (
                        <div>
                          <span className="font-extrabold text-sm text-slate-900 block">
                            {formatMinutesToDuration(calculation.totalMin)}
                          </span>
                          <div className="text-[10px] text-slate-500 font-medium">
                            <span className="text-blue-700 font-semibold">
                              Reg {formatMinutesToDuration(calculation.regularMin)}
                            </span>
                            {calculation.overtimeMin > 0 && (
                              <span className="text-orange-600 font-bold ml-1.5">
                                +OT {formatMinutesToDuration(calculation.overtimeMin)}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">—</span>
                      )}
                    </div>
                  </div>

                  {/* Note preview if any */}
                  {(record?.note || mark?.note) && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{record?.note || mark?.note}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CALENDAR GRID VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {SHORT_WEEKDAYS.map((w) => (
              <span key={w} className="text-[11px] font-bold text-slate-400 py-1 uppercase">
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Blank leading cells */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {monthDays.map((item) => {
              const { date, dayOfMonth, calculation } = item;
              const hasOvertime = calculation.overtimeMin > 0;
              const color = getStatusColor(calculation.status, hasOvertime);
              const isFuture = date > todayKey;
              const isToday = date === todayKey;

              return (
                <button
                  key={date}
                  disabled={isFuture}
                  onClick={() => handleDayClick(date)}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-1 border transition-all ${
                    isToday
                      ? 'border-blue-600 bg-blue-50/50 font-bold'
                      : isFuture
                      ? 'border-slate-100 bg-slate-50 text-slate-300'
                      : 'border-slate-100 bg-white hover:border-slate-300 active:scale-95'
                  }`}
                >
                  <span className={`text-xs ${isToday ? 'text-blue-700 font-extrabold' : 'text-slate-800'}`}>
                    {dayOfMonth}
                  </span>

                  {!isFuture && (
                    <div className="flex items-center gap-0.5 mt-1">
                      <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Calendar Status Legend */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>Overtime</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              <span>Leave</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Day Off</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Incomplete</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Button for quick manual entry */}
      <button
        onClick={handleAddNew}
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-blue-700 hover:bg-blue-800 active:scale-90 text-white flex items-center justify-center shadow-2xl transition-all cursor-pointer z-20"
        title="Add attendance record"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Modal */}
      <DayDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialDateKey={selectedDateForModal}
        isNewEntry={isNewEntry}
      />
    </div>
  );
};
