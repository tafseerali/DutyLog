// Export builder for DutyLog Excel and Power Query integration (TRD 7.2 & 7.3)
import { DayRecord, DayMark, UserSettings } from '../types';
import { calculateMonthSummary } from './calc';
import { formatMinutesToDecimalHours, format24Hour, getTodayDateKey } from './dateUtils';

/**
 * Escapes CSV text: wraps with double quotes if it contains comma, newline, or double quote.
 */
export function escapeCsvField(value: string | undefined | null): string {
  if (!value) return '';
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export interface ExportDataResult {
  daysCsv: string;
  summaryCsv: string;
}

/**
 * Builds `daysCsv` and `summaryCsv` for a single month matching TRD 7.2 & 7.3 specifications.
 */
export function buildMonthExport(
  monthKey: string,
  recordsMap: Map<string, DayRecord>,
  marksMap: Map<string, DayMark>,
  settings: UserSettings,
  todayKey = getTodayDateKey()
): ExportDataResult {
  const { summary, days } = calculateMonthSummary(monthKey, recordsMap, marksMap, settings, todayKey);

  // 1. daysCsv
  // Header: date,weekday,status,in,out,regular_hours,overtime_hours,total_hours,late_minutes,source,note
  const daysHeader = 'date,weekday,status,in,out,regular_hours,overtime_hours,total_hours,late_minutes,source,note';
  const dayRows: string[] = [daysHeader];

  for (const item of days) {
    // Omit future dates
    if (item.date > todayKey) {
      continue;
    }

    const { date, weekday, record, mark, calculation } = item;
    const status = calculation.status;

    let inStr = '';
    let outStr = '';
    let sourceStr = '';
    let noteStr = '';

    if (record) {
      if (record.inAt) inStr = format24Hour(record.inAt.toDate());
      if (record.outAt) outStr = format24Hour(record.outAt.toDate());
      sourceStr = record.source || '';
      noteStr = record.note || '';
    }

    if (mark) {
      if (mark.note && !noteStr) {
        noteStr = mark.note;
      }
    }

    const regHours = formatMinutesToDecimalHours(calculation.regularMin);
    const otHours = formatMinutesToDecimalHours(calculation.overtimeMin);
    const totHours = formatMinutesToDecimalHours(calculation.totalMin);
    const lateM = calculation.lateMin;

    const row = [
      date,
      weekday,
      status,
      inStr,
      outStr,
      regHours,
      otHours,
      totHours,
      lateM.toString(),
      sourceStr,
      escapeCsvField(noteStr),
    ].join(',');

    dayRows.push(row);
  }

  const daysCsv = dayRows.join('\n') + '\n';

  // 2. summaryCsv
  // Header: month,working_days,present,absent,leave,holiday,incomplete,regular_hours,overtime_hours,total_hours,late_count,late_minutes
  const summaryHeader = 'month,working_days,present,absent,leave,holiday,incomplete,regular_hours,overtime_hours,total_hours,late_count,late_minutes';
  const summaryRow = [
    summary.month,
    summary.workingDays,
    summary.present,
    summary.absent,
    summary.leave,
    summary.holiday,
    summary.incomplete,
    formatMinutesToDecimalHours(summary.regularMinutes),
    formatMinutesToDecimalHours(summary.overtimeMinutes),
    formatMinutesToDecimalHours(summary.totalMinutes),
    summary.lateCount,
    summary.lateMinutes,
  ].join(',');

  const summaryCsv = `${summaryHeader}\n${summaryRow}\n`;

  return {
    daysCsv,
    summaryCsv,
  };
}

/**
 * Builds the Power Query M-code for Excel import (TRD 7.5)
 */
export function buildPowerQueryCode(restUrl: string, type: 'days' | 'summary' = 'days'): string {
  if (type === 'summary') {
    return `let
    Source = Json.Document(Web.Contents("${restUrl}")),
    CsvText = Source[fields][summaryCsv][stringValue],
    Raw = Csv.Document(Text.ToBinary(CsvText), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    Headers = Table.PromoteHeaders(Raw, [PromoteAllScalars=true]),
    Typed = Table.TransformColumnTypes(Headers, {{"working_days", Int64.Type}, {"present", Int64.Type}, {"absent", Int64.Type}, {"leave", Int64.Type}, {"holiday", Int64.Type}, {"incomplete", Int64.Type}, {"regular_hours", type number}, {"overtime_hours", type number}, {"total_hours", type number}, {"late_count", Int64.Type}, {"late_minutes", Int64.Type}}, "en-US")
in
    Typed`;
  }

  return `let
    Source = Json.Document(Web.Contents("${restUrl}")),
    CsvText = Source[fields][daysCsv][stringValue],
    Raw = Csv.Document(Text.ToBinary(CsvText), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    Headers = Table.PromoteHeaders(Raw, [PromoteAllScalars=true]),
    Typed = Table.TransformColumnTypes(Headers, {{"regular_hours", type number}, {"overtime_hours", type number}, {"total_hours", type number}, {"late_minutes", Int64.Type}}, "en-US")
in
    Typed`;
}
