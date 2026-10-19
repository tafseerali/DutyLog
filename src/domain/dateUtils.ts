// Date and Time helpers for DutyLog

/**
 * Returns today's dateKey in local device timezone (YYYY-MM-DD)
 */
export function getTodayDateKey(): string {
  const now = new Date();
  return formatDateKey(now);
}

/**
 * Formats a Date object as YYYY-MM-DD
 */
export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Formats a Date object as YYYY-MM
 */
export function formatMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Parses YYYY-MM-DD into a local Date object (at 00:00:00 local time)
 */
export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Parses "HH:mm" into total minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Formats minutes from midnight to "HH:mm"
 */
export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats minutes to "HH:MM" display (e.g. 8h 30m -> "08:30" or "160:45")
 */
export function formatMinutesToDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '00:00';
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats minutes to hours with 2 decimal places (e.g. 480 -> "8.00")
 */
export function formatMinutesToDecimalHours(minutes: number): string {
  const hours = minutes / 60;
  return hours.toFixed(2);
}

/**
 * Extracts "HH:mm" (24-hour) from Date
 */
export function format24Hour(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Formats Date to 12-hour AM/PM string, e.g. "07:58 AM"
 */
export function format12Hour(d: Date): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 hour is 12
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

/**
 * Short weekday name (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
 */
export const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const FULL_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getWeekdayName(dateKey: string): string {
  const d = parseDateKey(dateKey);
  return SHORT_WEEKDAYS[d.getDay()];
}

/**
 * Get all dateKeys in a month "YYYY-MM"
 */
export function getDaysInMonth(monthKey: string): string[] {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  // Day 0 of next month is the last day of current month
  const lastDay = new Date(year, month, 0).getDate();
  const days: string[] = [];
  for (let day = 1; day <= lastDay; day++) {
    const dStr = String(day).padStart(2, '0');
    days.push(`${yearStr}-${monthStr}-${dStr}`);
  }
  return days;
}

/**
 * Human-readable month title, e.g. "October 2026"
 */
export function formatMonthDisplay(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Human-readable full date, e.g. "Monday, 19 Oct 2026"
 */
export function formatFullDateDisplay(dateKey: string): string {
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
