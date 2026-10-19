// Core calculation logic for DutyLog according to TRD 4.2, 4.3, 4.4 and PRD FR-4, FR-5, FR-6
import { DayCalculation, DayRecord, DayMark, UserSettings, MonthSummary, DayDetailItem, DayStatus } from '../types';
import { parseDateKey, parseTimeToMinutes, getDaysInMonth, getWeekdayName, getTodayDateKey } from './dateUtils';

export interface CalcDayOptions {
  dateKey: string;
  record?: DayRecord | null;
  mark?: DayMark | null;
  settings: UserSettings;
  todayKey?: string;
  nowMinutes?: number; // for live running calculation on today
}

/**
 * Calculates day status, regular, overtime, late, and total minutes for a given date.
 */
export function calculateDay(options: CalcDayOptions): DayCalculation {
  const { dateKey, record, mark, settings } = options;
  const todayKey = options.todayKey || getTodayDateKey();
  const dateObj = parseDateKey(dateKey);
  const weekday = dateObj.getDay(); // 0 = Sun, 5 = Fri, etc.
  const isWeeklyOffDay = weekday === settings.weeklyOff;

  // 1. Future dates
  if (dateKey > todayKey) {
    return {
      regularMin: 0,
      overtimeMin: 0,
      totalMin: 0,
      lateMin: 0,
      status: 'Future',
    };
  }

  // 2. Day Mark exists (Leave or Holiday)
  if (mark) {
    if (mark.type === 'leave') {
      return {
        regularMin: 0,
        overtimeMin: 0,
        totalMin: 0,
        lateMin: 0,
        status: 'Leave',
      };
    }
    if (mark.type === 'holiday') {
      // If user punches on a Holiday, time counts as overtime
      if (record && record.inAt && record.outAt) {
        const inDate = record.inAt.toDate();
        const outDate = record.outAt.toDate();
        const inMin = inDate.getHours() * 60 + inDate.getMinutes();
        const outMin = outDate.getHours() * 60 + outDate.getMinutes();
        const overtime = Math.max(0, outMin - inMin);
        return {
          regularMin: 0,
          overtimeMin: overtime,
          totalMin: overtime,
          lateMin: 0,
          status: 'Holiday',
        };
      }
      return {
        regularMin: 0,
        overtimeMin: 0,
        totalMin: 0,
        lateMin: 0,
        status: 'Holiday',
      };
    }
  }

  // 3. No record exists
  if (!record || !record.inAt) {
    if (isWeeklyOffDay) {
      return {
        regularMin: 0,
        overtimeMin: 0,
        totalMin: 0,
        lateMin: 0,
        status: 'Weekly Off',
      };
    }
    if (dateKey < todayKey) {
      return {
        regularMin: 0,
        overtimeMin: 0,
        totalMin: 0,
        lateMin: 0,
        status: 'Absent',
      };
    }
    // Today with no punch yet
    return {
      regularMin: 0,
      overtimeMin: 0,
      totalMin: 0,
      lateMin: 0,
      status: 'Incomplete', // or no punch
    };
  }

  // 4. Record has IN but missing OUT
  if (!record.outAt) {
    const status: DayStatus = dateKey === todayKey ? 'In Progress' : 'Incomplete';
    let runningLate = 0;
    if (record.inAt) {
      const inDate = record.inAt.toDate();
      const inMin = inDate.getHours() * 60 + inDate.getMinutes();
      const dutyStartMin = parseTimeToMinutes(settings.dutyStart);
      runningLate = Math.max(0, inMin - dutyStartMin);
    }
    return {
      regularMin: 0,
      overtimeMin: 0,
      totalMin: 0,
      lateMin: runningLate,
      status,
    };
  }

  // 5. Record has both IN and OUT
  const inDate = record.inAt.toDate();
  const outDate = record.outAt.toDate();
  const inMin = inDate.getHours() * 60 + inDate.getMinutes();
  const outMin = outDate.getHours() * 60 + outDate.getMinutes();
  const dutyStartMin = parseTimeToMinutes(settings.dutyStart);
  const dutyEndMin = parseTimeToMinutes(settings.dutyEnd);

  // If day is weekly off, all time is overtime
  if (isWeeklyOffDay) {
    const overtime = Math.max(0, outMin - inMin);
    return {
      regularMin: 0,
      overtimeMin: overtime,
      totalMin: overtime,
      lateMin: 0,
      status: 'Present',
    };
  }

  // Normal working day calculation (TRD 4.2)
  const effectiveStart = Math.max(inMin, dutyStartMin);
  const regularEnd = Math.min(outMin, dutyEndMin);
  const regularMin = Math.max(0, regularEnd - effectiveStart);
  const overtimeMin = Math.max(0, outMin - Math.max(inMin, dutyEndMin));
  const lateMin = Math.max(0, inMin - dutyStartMin);
  const totalMin = regularMin + overtimeMin;

  return {
    regularMin,
    overtimeMin,
    totalMin,
    lateMin,
    status: 'Present',
  };
}

/**
 * Calculates the running hours for an in-progress punch on today
 */
export function calculateRunningToday(inDate: Date, settings: UserSettings, isNonWorkingDay: boolean): {
  regularMin: number;
  overtimeMin: number;
  totalMin: number;
  lateMin: number;
} {
  const now = new Date();
  const inMin = inDate.getHours() * 60 + inDate.getMinutes();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const currentMin = Math.max(inMin, nowMin);

  const dutyStartMin = parseTimeToMinutes(settings.dutyStart);
  const dutyEndMin = parseTimeToMinutes(settings.dutyEnd);

  if (isNonWorkingDay) {
    const overtime = Math.max(0, currentMin - inMin);
    return {
      regularMin: 0,
      overtimeMin: overtime,
      totalMin: overtime,
      lateMin: 0,
    };
  }

  const effectiveStart = Math.max(inMin, dutyStartMin);
  const regularEnd = Math.min(currentMin, dutyEndMin);
  const regularMin = Math.max(0, regularEnd - effectiveStart);
  const overtimeMin = Math.max(0, currentMin - Math.max(inMin, dutyEndMin));
  const lateMin = Math.max(0, inMin - dutyStartMin);
  const totalMin = regularMin + overtimeMin;

  return {
    regularMin,
    overtimeMin,
    totalMin,
    lateMin,
  };
}

/**
 * Computes monthly summary statistics according to PRD FR-6
 */
export function calculateMonthSummary(
  monthKey: string,
  recordsMap: Map<string, DayRecord>,
  marksMap: Map<string, DayMark>,
  settings: UserSettings,
  todayKey = getTodayDateKey()
): { summary: MonthSummary; days: DayDetailItem[] } {
  const daysInMonth = getDaysInMonth(monthKey);

  let workingDays = 0;
  let present = 0;
  let absent = 0;
  let leave = 0;
  let holiday = 0;
  let incomplete = 0;
  let regularMinutes = 0;
  let overtimeMinutes = 0;
  let totalMinutes = 0;
  let lateCount = 0;
  let lateMinutes = 0;

  const days: DayDetailItem[] = [];

  for (const dateKey of daysInMonth) {
    const record = recordsMap.get(dateKey);
    const mark = marksMap.get(dateKey);
    const dateObj = parseDateKey(dateKey);
    const weekday = dateObj.getDay();
    const isWeeklyOff = weekday === settings.weeklyOff;

    const calc = calculateDay({
      dateKey,
      record,
      mark,
      settings,
      todayKey,
    });

    // Working days definition: not Weekly Off and not Holiday (from 1st to last day of month)
    const isHoliday = mark?.type === 'holiday';
    if (!isWeeklyOff && !isHoliday) {
      workingDays++;
    }

    if (calc.status === 'Present') {
      present++;
    } else if (calc.status === 'Absent') {
      absent++;
    } else if (calc.status === 'Leave') {
      leave++;
    } else if (calc.status === 'Holiday') {
      holiday++;
    } else if (calc.status === 'Incomplete') {
      incomplete++;
    }

    if (calc.status === 'Present' || calc.status === 'Holiday') {
      regularMinutes += calc.regularMin;
      overtimeMinutes += calc.overtimeMin;
      totalMinutes += calc.totalMin;

      // Late counts only on normal working days when arrived after dutyStart
      if (!isWeeklyOff && !isHoliday && calc.lateMin > 0) {
        lateCount++;
        lateMinutes += calc.lateMin;
      }
    }

    days.push({
      date: dateKey,
      weekday: getWeekdayName(dateKey),
      dayOfMonth: dateObj.getDate(),
      record,
      mark,
      calculation: calc,
    });
  }

  const summary: MonthSummary = {
    month: monthKey,
    workingDays,
    present,
    absent,
    leave,
    holiday,
    incomplete,
    regularMinutes,
    overtimeMinutes,
    totalMinutes,
    lateCount,
    lateMinutes,
  };

  return { summary, days };
}
