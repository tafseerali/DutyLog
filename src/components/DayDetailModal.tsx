import React, { useState, useEffect, useMemo } from 'react';
import { useDuty } from '../context/DutyContext';
import { DayRecord, DayMark, MarkType, RecordSource } from '../types';
import {
  formatDateKey,
  parseDateKey,
  format24Hour,
  format12Hour,
  getTodayDateKey,
  formatMinutesToDuration,
  parseTimeToMinutes
} from '../domain/dateUtils';
import { calculateDay } from '../domain/calc';
import { X, Trash2, Clock, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialDateKey?: string;
  isNewEntry?: boolean;
}

export const DayDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialDateKey,
  isNewEntry = false,
}) => {
  const {
    settings,
    recordsMap,
    marksMap,
    saveDayRecord,
    deleteRecord,
    setMark,
    removeMark,
  } = useDuty();

  const todayKey = getTodayDateKey();
  const [selectedDateKey, setSelectedDateKey] = useState<string>(initialDateKey || todayKey);

  // Status choice: 'worked' | 'leave' | 'holiday'
  const [entryType, setEntryType] = useState<'worked' | 'leave' | 'holiday'>('worked');

  // Times in HH:mm 24-hr format for standard input
  const [inTimeStr, setInTimeStr] = useState<string>('08:00');
  const [outTimeStr, setOutTimeStr] = useState<string>('16:00');
  const [hasOutTime, setHasOutTime] = useState<boolean>(true);

  const [note, setNote] = useState<string>('');
  const [source, setSource] = useState<RecordSource>('manual');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConfirmingLeaveReplace, setIsConfirmingLeaveReplace] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load existing data when modal opens or selectedDateKey changes
  useEffect(() => {
    if (!isOpen) return;
    const targetDate = initialDateKey || todayKey;
    setSelectedDateKey(targetDate);
    setErrorMsg(null);
    setIsConfirmingLeaveReplace(false);

    const existingRecord = recordsMap.get(targetDate);
    const existingMark = marksMap.get(targetDate);

    if (existingMark) {
      setEntryType(existingMark.type);
      setNote(existingMark.note || '');
    } else if (existingRecord) {
      setEntryType('worked');
      if (existingRecord.inAt) {
        setInTimeStr(format24Hour(existingRecord.inAt.toDate()));
      }
      if (existingRecord.outAt) {
        setOutTimeStr(format24Hour(existingRecord.outAt.toDate()));
        setHasOutTime(true);
      } else {
        setHasOutTime(false);
      }
      setSource(existingRecord.source || 'manual');
      setNote(existingRecord.note || '');
    } else {
      // Default new entry
      setEntryType('worked');
      setInTimeStr('08:00');
      setOutTimeStr('16:00');
      setHasOutTime(true);
      setSource('manual');
      setNote('');
    }
  }, [isOpen, initialDateKey, recordsMap, marksMap, todayKey]);

  // Compute live calculation preview for worked days
  const previewCalculation = useMemo(() => {
    if (entryType !== 'worked') return null;
    const baseDate = parseDateKey(selectedDateKey);

    const [inH, inM] = inTimeStr.split(':').map(Number);
    const inDate = new Date(baseDate);
    inDate.setHours(inH || 0, inM || 0, 0, 0);

    let outDate: Date | null = null;
    if (hasOutTime && outTimeStr) {
      const [outH, outM] = outTimeStr.split(':').map(Number);
      outDate = new Date(baseDate);
      outDate.setHours(outH || 0, outM || 0, 0, 0);
    }

    const mockRecord: DayRecord = {
      date: selectedDateKey,
      inAt: { toDate: () => inDate } as any,
      outAt: outDate ? ({ toDate: () => outDate } as any) : null,
      source: 'manual',
    };

    return calculateDay({
      dateKey: selectedDateKey,
      record: mockRecord,
      settings,
      todayKey,
    });
  }, [entryType, selectedDateKey, inTimeStr, outTimeStr, hasOutTime, settings, todayKey]);

  if (!isOpen) return null;

  const existingRecord = recordsMap.get(selectedDateKey);
  const existingMark = marksMap.get(selectedDateKey);

  const handleSave = async () => {
    setErrorMsg(null);

    // Rule: Cannot create or edit future dates
    if (selectedDateKey > todayKey) {
      setErrorMsg('You cannot add records for future dates');
      return;
    }

    // Rule: Leave replacement confirmation
    if (entryType === 'leave' && existingRecord && !isConfirmingLeaveReplace) {
      setIsConfirmingLeaveReplace(true);
      return;
    }

    setIsSaving(true);
    try {
      if (entryType === 'leave' || entryType === 'holiday') {
        // Remove any normal record if leave
        if (entryType === 'leave' && existingRecord) {
          await deleteRecord(selectedDateKey);
        }
        await setMark(selectedDateKey, entryType, note);
      } else {
        // Worked day
        if (existingMark) {
          await removeMark(selectedDateKey);
        }

        const baseDate = parseDateKey(selectedDateKey);
        const [inH, inM] = inTimeStr.split(':').map(Number);
        const inDate = new Date(baseDate);
        inDate.setHours(inH, inM, 0, 0);

        let outDate: Date | null = null;
        if (hasOutTime && outTimeStr) {
          const [outH, outM] = outTimeStr.split(':').map(Number);
          outDate = new Date(baseDate);
          outDate.setHours(outH, outM, 0, 0);

          if (outDate.getTime() <= inDate.getTime()) {
            setErrorMsg('OUT time must be after IN time');
            setIsSaving(false);
            return;
          }
        }

        await saveDayRecord(selectedDateKey, inDate, outDate, 'manual', note);
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this day record?')) return;
    setIsSaving(true);
    try {
      if (existingRecord) {
        await deleteRecord(selectedDateKey);
      }
      if (existingMark) {
        await removeMark(selectedDateKey);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-[420px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">
              {isNewEntry ? 'Add Attendance' : 'Day Detail & Edit'}
            </h3>
            <p className="text-xs text-slate-500 font-medium">{selectedDateKey}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Confirm Leave replace record */}
          {isConfirmingLeaveReplace && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Remove time record?</span>
              </div>
              <p>A punch record exists on this date. Remove the time record and mark as Leave?</p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs"
                >
                  Yes, Remove & Mark Leave
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingLeaveReplace(false)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date</label>
            <input
              type="date"
              max={todayKey}
              value={selectedDateKey}
              onChange={(e) => {
                setSelectedDateKey(e.target.value);
                setErrorMsg(null);
              }}
              disabled={!isNewEntry}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-sm text-slate-900 focus:outline-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          {/* Status selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEntryType('worked')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  entryType === 'worked'
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Worked
              </button>
              <button
                type="button"
                onClick={() => setEntryType('leave')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  entryType === 'leave'
                    ? 'bg-purple-50 border-purple-600 text-purple-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Leave
              </button>
              <button
                type="button"
                onClick={() => setEntryType('holiday')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  entryType === 'holiday'
                    ? 'bg-slate-100 border-slate-600 text-slate-800 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Holiday
              </button>
            </div>
          </div>

          {/* Worked Time Pickers */}
          {entryType === 'worked' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Punch IN (Arrival)
                  </label>
                  <input
                    type="time"
                    value={inTimeStr}
                    onChange={(e) => {
                      setInTimeStr(e.target.value);
                      setErrorMsg(null);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-sm text-slate-900 focus:outline-blue-600"
                  />
                  <span className="text-[11px] text-slate-500 font-medium block mt-1">
                    {inTimeStr ? format12Hour(new Date(`2000-01-01T${inTimeStr}`)) : ''}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      Punch OUT (Exit)
                    </label>
                    <button
                      type="button"
                      onClick={() => setHasOutTime(!hasOutTime)}
                      className="text-[10px] font-bold text-blue-700 hover:underline"
                    >
                      {hasOutTime ? 'Clear OUT' : '+ Add OUT'}
                    </button>
                  </div>
                  {hasOutTime ? (
                    <>
                      <input
                        type="time"
                        value={outTimeStr}
                        onChange={(e) => {
                          setOutTimeStr(e.target.value);
                          setErrorMsg(null);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-sm text-slate-900 focus:outline-blue-600"
                      />
                      <span className="text-[11px] text-slate-500 font-medium block mt-1">
                        {outTimeStr ? format12Hour(new Date(`2000-01-01T${outTimeStr}`)) : ''}
                      </span>
                    </>
                  ) : (
                    <div className="p-2 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-amber-800 text-[11px] font-medium text-center">
                      Missing OUT punch
                    </div>
                  )}
                </div>
              </div>

              {/* Source badge */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 text-slate-500">
                <span>Source:</span>
                <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-200 text-slate-700">
                  {source.toUpperCase()}
                </span>
              </div>

              {/* Live calculation preview */}
              {previewCalculation && hasOutTime && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Live Calculation Preview
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-white border border-slate-100 shadow-2xs">
                      <span className="text-[10px] text-slate-500 font-semibold block">Regular</span>
                      <span className="text-xs font-bold text-blue-700">
                        {formatMinutesToDuration(previewCalculation.regularMin)}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-100 shadow-2xs">
                      <span className="text-[10px] text-slate-500 font-semibold block">Overtime</span>
                      <span className="text-xs font-bold text-orange-600">
                        {formatMinutesToDuration(previewCalculation.overtimeMin)}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-100 shadow-2xs">
                      <span className="text-[10px] text-slate-500 font-semibold block">Late</span>
                      <span className={`text-xs font-bold ${previewCalculation.lateMin > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                        {previewCalculation.lateMin > 0 ? `${previewCalculation.lateMin} min` : '0 min'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Note Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Note (optional, max 200 characters)
            </label>
            <input
              type="text"
              maxLength={200}
              placeholder="e.g. Forgot thumb scan, special project..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-sm text-slate-900 focus:outline-blue-600"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          {(existingRecord || existingMark) ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSaving}
              className="w-10 h-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0"
              title="Delete Record"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-95 text-white font-bold text-sm shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
