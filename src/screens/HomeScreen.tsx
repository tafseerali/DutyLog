import React, { useState, useEffect } from 'react';
import { useDuty } from '../context/DutyContext';
import {
  getTodayDateKey,
  format12Hour,
  formatMinutesToDuration,
  parseDateKey,
  parseTimeToMinutes,
  getWeekdayName
} from '../domain/dateUtils';
import { calculateDay, calculateRunningToday } from '../domain/calc';
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  CalendarCheck2,
  CalendarOff,
  CloudOff
} from 'lucide-react';
import { DayDetailModal } from '../components/DayDetailModal';
import { PWAInstallBanner } from '../components/PWAInstallBanner';

export const HomeScreen: React.FC = () => {
  const {
    settings,
    todayRecord,
    todayMark,
    recordsMap,
    marksMap,
    syncStatus,
    undoState,
    punchIn,
    punchOut,
    undoLastPunch,
    clearUndo,
    setMark,
    removeMark,
    monthDays,
  } = useDuty();

  const todayKey = getTodayDateKey();
  const todayDateObj = parseDateKey(todayKey);
  const isWeeklyOff = todayDateObj.getDay() === settings.weeklyOff;
  const isHoliday = todayMark?.type === 'holiday';
  const isDayOff = isWeeklyOff || isHoliday;

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState<string>(todayKey);
  const [punching, setPunching] = useState<boolean>(false);

  // Live timer tick every second for clock, re-render every minute for running hours
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Today calculation
  const todayCalc = calculateDay({
    dateKey: todayKey,
    record: todayRecord,
    mark: todayMark,
    settings,
    todayKey,
  });

  // Running live hours if punched IN but no OUT
  const isPunchedIn = Boolean(todayRecord?.inAt);
  const isPunchedOut = Boolean(todayRecord?.outAt);
  const isDoneToday = isPunchedIn && isPunchedOut;
  const isLeave = todayMark?.type === 'leave';

  let runningHours = {
    regularMin: todayCalc.regularMin,
    overtimeMin: todayCalc.overtimeMin,
    totalMin: todayCalc.totalMin,
    lateMin: todayCalc.lateMin,
  };

  if (isPunchedIn && !isPunchedOut && todayRecord?.inAt) {
    runningHours = calculateRunningToday(
      todayRecord.inAt.toDate(),
      settings,
      isDayOff
    );
  }

  // Find incomplete past days this month
  const incompletePastDays = monthDays.filter(
    (d) => d.calculation.status === 'Incomplete' && d.date < todayKey
  );

  const handlePunch = async () => {
    if (punching || isDoneToday || isLeave) return;
    setPunching(true);
    try {
      if (!isPunchedIn) {
        await punchIn();
        const timeNow = format12Hour(new Date());
        setSuccessBanner(`IN recorded at ${timeNow}`);
      } else {
        await punchOut();
        const timeNow = format12Hour(new Date());
        setSuccessBanner(`OUT recorded at ${timeNow}`);
      }
    } catch (err: any) {
      alert(err.message || 'Error recording punch');
    } finally {
      setPunching(false);
    }
  };

  const handleUndo = async () => {
    try {
      await undoLastPunch();
      setSuccessBanner('Last punch removed');
      setTimeout(() => setSuccessBanner(null), 3000);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleQuickLeave = async () => {
    if (window.confirm('Mark today as Leave?')) {
      await setMark(todayKey, 'leave', 'Marked from Home');
    }
  };

  const handleRemoveLeave = async () => {
    await removeMark(todayKey);
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Offline Banner */}
      {syncStatus === 'Offline' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 font-medium shadow-2xs">
          <CloudOff className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Offline. Changes will sync when you are back online</span>
        </div>
      )}

      {/* Install App on Phone Banner */}
      <PWAInstallBanner />

      {/* Snackbar / Undo Banner */}
      {undoState && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-xl animate-in slide-in-from-top-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold">
              {successBanner || `${undoState.type} recorded successfully`}
            </span>
          </div>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 active:scale-95 text-white px-3 py-1 rounded-xl text-xs font-bold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Day Off Banner if today is Weekly Off or Holiday */}
      {isDayOff && (
        <div className="bg-slate-100 border border-slate-300 text-slate-800 p-3 rounded-2xl text-xs flex items-center gap-2.5 font-medium shadow-2xs">
          <CalendarCheck2 className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            {isHoliday ? 'Today is a Holiday. ' : 'Today is a day off. '}
            All time counts as overtime.
          </span>
        </div>
      )}

      {/* Incomplete punch warning from past days */}
      {incompletePastDays.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-2xl shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-amber-900">Missing OUT Punch</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                You forgot to punch OUT on {incompletePastDays[0].date}.
              </p>
              <button
                onClick={() => {
                  setSelectedDateForModal(incompletePastDays[0].date);
                  setDetailModalOpen(true);
                }}
                className="mt-2 text-xs font-bold text-amber-900 bg-amber-200/70 hover:bg-amber-200 px-3 py-1 rounded-lg transition-colors"
              >
                Fix now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Large Center Punch Button Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center flex flex-col items-center">
        {/* Live Clock Display */}
        <div className="text-slate-500 font-mono text-sm tracking-wider mb-2">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>

        {/* Big Circular Punch Button */}
        <div className="my-3">
          {isLeave ? (
            <div className="w-48 h-48 rounded-full border-4 border-purple-200 bg-purple-50 flex flex-col items-center justify-center p-4">
              <CalendarOff className="w-10 h-10 text-purple-600 mb-2" />
              <span className="font-bold text-purple-900 text-sm">Marked as Leave</span>
              <button
                onClick={handleRemoveLeave}
                className="mt-2 text-xs font-bold text-purple-700 underline hover:text-purple-900"
              >
                Remove Leave
              </button>
            </div>
          ) : isDoneToday ? (
            <div className="w-48 h-48 rounded-full border-4 border-emerald-300 bg-emerald-50/70 flex flex-col items-center justify-center p-4 shadow-inner">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mb-2" />
              <span className="font-bold text-emerald-900 text-base">Done for today</span>
              <span className="text-[11px] text-emerald-700 font-medium mt-1">Both punches logged</span>
            </div>
          ) : !isPunchedIn ? (
            <button
              onClick={handlePunch}
              disabled={punching}
              className="w-48 h-48 rounded-full bg-blue-700 hover:bg-blue-800 active:scale-95 text-white flex flex-col items-center justify-center p-4 shadow-xl transition-all border-4 border-blue-200 hover:border-blue-300 cursor-pointer group"
            >
              <LogIn className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-extrabold text-xl tracking-wide">Punch IN</span>
              <span className="text-[11px] text-blue-200 font-medium mt-1">Tap to record start</span>
            </button>
          ) : (
            <button
              onClick={handlePunch}
              disabled={punching}
              className="w-48 h-48 rounded-full bg-orange-600 hover:bg-orange-700 active:scale-95 text-white flex flex-col items-center justify-center p-4 shadow-xl transition-all border-4 border-orange-200 hover:border-orange-300 cursor-pointer group animate-pulse"
            >
              <LogOut className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform" />
              <span className="font-extrabold text-xl tracking-wide">Punch OUT</span>
              <span className="text-[11px] text-orange-100 font-medium mt-1">Tap to record end</span>
            </button>
          )}
        </div>

        {/* Today's Schedule Target */}
        <div className="text-xs text-slate-500 font-medium mt-2 flex items-center justify-center gap-1.5">
          <span>Duty Hours:</span>
          <span className="font-bold text-slate-700">
            {settings.dutyStart} — {settings.dutyEnd}
          </span>
        </div>
      </div>

      {/* "Today" Summary Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700" />
            <h3 className="font-bold text-slate-900 text-sm">Today&apos;s Duty Record</h3>
          </div>
          <button
            onClick={() => {
              setSelectedDateForModal(todayKey);
              setDetailModalOpen(true);
            }}
            className="text-xs font-semibold text-blue-700 hover:underline"
          >
            Edit / Fix
          </button>
        </div>

        {/* Timestamps row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Punch IN</span>
            <span className="font-bold text-slate-900 text-base">
              {todayRecord?.inAt ? format12Hour(todayRecord.inAt.toDate()) : '— : —'}
            </span>
            {todayRecord?.inAt && runningHours.lateMin > 0 && !isDayOff && (
              <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                Late by {runningHours.lateMin} min
              </span>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Punch OUT</span>
            <span className="font-bold text-slate-900 text-base">
              {todayRecord?.outAt ? format12Hour(todayRecord.outAt.toDate()) : isPunchedIn ? 'In Progress' : '— : —'}
            </span>
            {isPunchedIn && !isPunchedOut && (
              <span className="inline-block mt-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md animate-pulse">
                Running...
              </span>
            )}
          </div>
        </div>

        {/* Hours Breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="p-2.5 rounded-2xl bg-blue-50/70 border border-blue-100">
            <span className="text-[10px] font-semibold text-blue-600 block">Regular</span>
            <span className="font-extrabold text-base text-blue-800">
              {formatMinutesToDuration(runningHours.regularMin)}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-orange-50/70 border border-orange-100">
            <span className="text-[10px] font-semibold text-orange-600 block">Overtime</span>
            <span className="font-extrabold text-base text-orange-700">
              {formatMinutesToDuration(runningHours.overtimeMin)}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-100 border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-600 block">Total</span>
            <span className="font-extrabold text-base text-slate-900">
              {formatMinutesToDuration(runningHours.totalMin)}
            </span>
          </div>
        </div>

        {/* Quick action: Mark today as Leave */}
        {!isLeave && !isPunchedIn && (
          <div className="pt-2 text-center">
            <button
              onClick={handleQuickLeave}
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors"
            >
              Mark today as Leave
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <DayDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        initialDateKey={selectedDateForModal}
      />
    </div>
  );
};
