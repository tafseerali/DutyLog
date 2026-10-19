import React from 'react';
import { useDuty } from '../context/DutyContext';
import { MonthPicker } from '../components/MonthPicker';
import {
  formatMinutesToDuration,
  formatMinutesToDecimalHours,
  format12Hour,
  formatMonthDisplay
} from '../domain/dateUtils';
import { buildMonthExport } from '../domain/exportBuilder';
import {
  BarChart3,
  Clock,
  Download,
  CalendarCheck,
  UserX,
  CalendarOff,
  Flame,
  AlertTriangle,
  Award,
  Calendar
} from 'lucide-react';

export const SummaryScreen: React.FC = () => {
  const {
    currentMonthKey,
    setCurrentMonthKey,
    monthSummary,
    monthDays,
    recordsMap,
    marksMap,
    settings,
  } = useDuty();

  // Find top 3 overtime days
  const overtimeDays = [...monthDays]
    .filter((d) => d.calculation.overtimeMin > 0)
    .sort((a, b) => b.calculation.overtimeMin - a.calculation.overtimeMin)
    .slice(0, 3);

  const handleExportCsv = () => {
    const exportResult = buildMonthExport(currentMonthKey, recordsMap, marksMap, settings);
    const blob = new Blob([exportResult.daysCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DutyLog_${currentMonthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      {/* Month Selector */}
      <MonthPicker currentMonthKey={currentMonthKey} onChangeMonth={setCurrentMonthKey} />

      {/* Hero Card: Total Hours */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase font-extrabold text-blue-200 tracking-wider">
            Monthly Work Hours
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-600/60 text-blue-100">
            {formatMonthDisplay(currentMonthKey)}
          </span>
        </div>

        <div className="my-2">
          <span className="font-extrabold text-4xl tracking-tight">
            {formatMinutesToDuration(monthSummary.totalMinutes)}
          </span>
          <span className="text-xs text-blue-200 ml-2 font-medium">
            ({formatMinutesToDecimalHours(monthSummary.totalMinutes)} hrs)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-blue-500/30">
          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[11px] font-semibold text-blue-200 block mb-0.5">Regular Hours</span>
            <span className="text-xl font-bold">
              {formatMinutesToDuration(monthSummary.regularMinutes)}
            </span>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[11px] font-semibold text-orange-200 block mb-0.5 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-300" />
              Overtime Hours
            </span>
            <span className="text-xl font-bold text-orange-100">
              {formatMinutesToDuration(monthSummary.overtimeMinutes)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Export Action */}
      <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-slate-200 shadow-xs">
        <div>
          <h4 className="text-xs font-bold text-slate-800">Export Month Data</h4>
          <p className="text-[11px] text-slate-500">Download formatted CSV for this month</p>
        </div>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* StatCards Grid */}
      <div>
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 px-1">
          Monthly Attendance Breakdown
        </h4>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Working Days */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Working Days</span>
              <Calendar className="w-4 h-4 text-blue-700" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900">
              {monthSummary.workingDays}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Excluding offs & holidays</span>
          </div>

          {/* Present */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-xs font-semibold text-slate-700">Present</span>
              <CalendarCheck className="w-4 h-4" />
            </div>
            <span className="text-2xl font-extrabold text-emerald-700">
              {monthSummary.present}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Days completed</span>
          </div>

          {/* Absent */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-red-600 mb-1">
              <span className="text-xs font-semibold text-slate-700">Absent</span>
              <UserX className="w-4 h-4" />
            </div>
            <span className="text-2xl font-extrabold text-red-600">
              {monthSummary.absent}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Unrecorded past days</span>
          </div>

          {/* Leave */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-purple-600 mb-1">
              <span className="text-xs font-semibold text-slate-700">Leave</span>
              <CalendarOff className="w-4 h-4" />
            </div>
            <span className="text-2xl font-extrabold text-purple-700">
              {monthSummary.leave}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Approved leaves</span>
          </div>

          {/* Holiday */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold text-slate-700">Holidays</span>
              <Award className="w-4 h-4 text-slate-500" />
            </div>
            <span className="text-2xl font-extrabold text-slate-800">
              {monthSummary.holiday}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Public holidays marked</span>
          </div>

          {/* Incomplete */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-xs font-semibold text-slate-700">Incomplete</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-2xl font-extrabold text-amber-700">
              {monthSummary.incomplete}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Missing OUT punches</span>
          </div>

          {/* Late count */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-xs font-semibold text-slate-700">Late Arrivals</span>
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-2xl font-extrabold text-amber-800">
              {monthSummary.lateCount}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Days arrived late</span>
          </div>

          {/* Total late minutes */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-xs font-semibold text-slate-700">Late Minutes</span>
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-2xl font-extrabold text-amber-800">
              {monthSummary.lateMinutes}m
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              ~{formatMinutesToDuration(monthSummary.lateMinutes)}
            </span>
          </div>
        </div>
      </div>

      {/* Top Overtime Days Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-orange-600" />
          <h4 className="text-xs font-bold text-slate-900">Top Overtime Days</h4>
        </div>

        {overtimeDays.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No overtime recorded this month</p>
        ) : (
          <div className="space-y-2">
            {overtimeDays.map((item, idx) => (
              <div
                key={item.date}
                className="flex items-center justify-between p-2.5 rounded-xl bg-orange-50/50 border border-orange-100"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-800 font-extrabold text-[11px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-800">{item.date}</span>
                    <span className="text-[10px] text-slate-500 block">
                      {item.record?.inAt && format12Hour(item.record.inAt.toDate())} →{' '}
                      {item.record?.outAt && format12Hour(item.record.outAt.toDate())}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-orange-700">
                  +{formatMinutesToDuration(item.calculation.overtimeMin)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
