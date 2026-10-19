// Data models for DutyLog
import { Timestamp } from 'firebase/firestore';

export type RecordSource = 'auto' | 'manual';
export type MarkType = 'leave' | 'holiday';

export type DayStatus =
  | 'Present'
  | 'Incomplete'
  | 'In Progress'
  | 'Absent'
  | 'Leave'
  | 'Weekly Off'
  | 'Holiday'
  | 'Future';

export interface DayRecord {
  date: string; // YYYY-MM-DD
  inAt: Timestamp | null;
  outAt: Timestamp | null;
  source: RecordSource;
  note?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface DayMark {
  date: string; // YYYY-MM-DD
  type: MarkType;
  note?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserSettings {
  dutyStart: string; // "08:00"
  dutyEnd: string;   // "16:00"
  weeklyOff: number; // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  updatedAt?: Timestamp;
}

export interface UserProfile {
  displayName: string;
  email: string;
  createdAt?: Timestamp;
  exportToken: string | null;
}

export interface DayCalculation {
  regularMin: number;
  overtimeMin: number;
  totalMin: number;
  lateMin: number;
  status: DayStatus;
}

export interface MonthSummary {
  month: string; // YYYY-MM
  workingDays: number;
  present: number;
  absent: number;
  leave: number;
  holiday: number;
  incomplete: number;
  regularMinutes: number;
  overtimeMinutes: number;
  totalMinutes: number;
  lateCount: number;
  lateMinutes: number;
}

export interface DayDetailItem {
  date: string; // YYYY-MM-DD
  weekday: string; // Mon, Tue...
  dayOfMonth: number;
  record?: DayRecord;
  mark?: DayMark;
  calculation: DayCalculation;
}
