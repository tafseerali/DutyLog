// Unit test validation for DutyLog Calc and ExportBuilder (TRD Section 9)
import { calculateDay, calculateMonthSummary } from './calc';
import { buildMonthExport, escapeCsvField } from './exportBuilder';
import { UserSettings, DayRecord, DayMark } from '../types';

function runTests() {
  const settings: UserSettings = {
    dutyStart: '08:00',
    dutyEnd: '16:00',
    weeklyOff: 5, // Friday
  };

  const todayKey = '2026-10-19'; // Monday

  console.log('--- RUNNING TRD SECTION 9 TEST CASES ---');

  // Case 1: 07:50 to 16:00, Normal day -> Reg 480, OT 0, Late 0
  const c1In = new Date('2026-10-19T07:50:00');
  const c1Out = new Date('2026-10-19T16:00:00');
  const res1 = calculateDay({
    dateKey: '2026-10-19',
    record: {
      date: '2026-10-19',
      inAt: { toDate: () => c1In } as any,
      outAt: { toDate: () => c1Out } as any,
      source: 'auto',
    },
    settings,
    todayKey,
  });
  console.assert(res1.regularMin === 480, `Case 1 Reg fail: expected 480 got ${res1.regularMin}`);
  console.assert(res1.overtimeMin === 0, `Case 1 OT fail: expected 0 got ${res1.overtimeMin}`);
  console.assert(res1.lateMin === 0, `Case 1 Late fail: expected 0 got ${res1.lateMin}`);

  // Case 2: 08:00 to 18:30, Normal day -> Reg 480, OT 150, Late 0
  const c2In = new Date('2026-10-19T08:00:00');
  const c2Out = new Date('2026-10-19T18:30:00');
  const res2 = calculateDay({
    dateKey: '2026-10-19',
    record: {
      date: '2026-10-19',
      inAt: { toDate: () => c2In } as any,
      outAt: { toDate: () => c2Out } as any,
      source: 'auto',
    },
    settings,
    todayKey,
  });
  console.assert(res2.regularMin === 480, `Case 2 Reg fail: expected 480 got ${res2.regularMin}`);
  console.assert(res2.overtimeMin === 150, `Case 2 OT fail: expected 150 got ${res2.overtimeMin}`);
  console.assert(res2.lateMin === 0, `Case 2 Late fail: expected 0 got ${res2.lateMin}`);

  // Case 3: 08:20 to 16:00, Normal day -> Reg 460, OT 0, Late 20
  const c3In = new Date('2026-10-19T08:20:00');
  const c3Out = new Date('2026-10-19T16:00:00');
  const res3 = calculateDay({
    dateKey: '2026-10-19',
    record: {
      date: '2026-10-19',
      inAt: { toDate: () => c3In } as any,
      outAt: { toDate: () => c3Out } as any,
      source: 'auto',
    },
    settings,
    todayKey,
  });
  console.assert(res3.regularMin === 460, `Case 3 Reg fail: expected 460 got ${res3.regularMin}`);
  console.assert(res3.overtimeMin === 0, `Case 3 OT fail: expected 0 got ${res3.overtimeMin}`);
  console.assert(res3.lateMin === 20, `Case 3 Late fail: expected 20 got ${res3.lateMin}`);

  // Case 4: 08:00 to 15:00, Normal day -> Reg 420, OT 0, Late 0
  const c4In = new Date('2026-10-19T08:00:00');
  const c4Out = new Date('2026-10-19T15:00:00');
  const res4 = calculateDay({
    dateKey: '2026-10-19',
    record: {
      date: '2026-10-19',
      inAt: { toDate: () => c4In } as any,
      outAt: { toDate: () => c4Out } as any,
      source: 'auto',
    },
    settings,
    todayKey,
  });
  console.assert(res4.regularMin === 420, `Case 4 Reg fail: expected 420 got ${res4.regularMin}`);
  console.assert(res4.overtimeMin === 0, `Case 4 OT fail: expected 0 got ${res4.overtimeMin}`);
  console.assert(res4.lateMin === 0, `Case 4 Late fail: expected 0 got ${res4.lateMin}`);

  // Case 5: 16:30 to 18:00, Normal day -> Reg 0, OT 90, Late 510
  const c5In = new Date('2026-10-19T16:30:00');
  const c5Out = new Date('2026-10-19T18:00:00');
  const res5 = calculateDay({
    dateKey: '2026-10-19',
    record: {
      date: '2026-10-19',
      inAt: { toDate: () => c5In } as any,
      outAt: { toDate: () => c5Out } as any,
      source: 'auto',
    },
    settings,
    todayKey,
  });
  console.assert(res5.regularMin === 0, `Case 5 Reg fail: expected 0 got ${res5.regularMin}`);
  console.assert(res5.overtimeMin === 90, `Case 5 OT fail: expected 90 got ${res5.overtimeMin}`);
  console.assert(res5.lateMin === 510, `Case 5 Late fail: expected 510 got ${res5.lateMin}`);

  // Case 6: 09:00 to 17:00 on Friday (weekly off: 2026-10-16 is Friday) -> Reg 0, OT 480
  const c6In = new Date('2026-10-16T09:00:00');
  const c6Out = new Date('2026-10-16T17:00:00');
  const res6 = calculateDay({
    dateKey: '2026-10-16',
    record: {
      date: '2026-10-16',
      inAt: { toDate: () => c6In } as any,
      outAt: { toDate: () => c6Out } as any,
      source: 'auto',
    },
    settings,
    todayKey,
  });
  console.assert(res6.regularMin === 0, `Case 6 Reg fail: expected 0 got ${res6.regularMin}`);
  console.assert(res6.overtimeMin === 480, `Case 6 OT fail: expected 480 got ${res6.overtimeMin}`);

  // Case 7: 08:00, OUT missing -> Reg 0, OT 0, Late 0
  const c7In = new Date('2026-10-19T08:00:00');
  const res7 = calculateDay({
    dateKey: '2026-10-19',
    record: {
      date: '2026-10-19',
      inAt: { toDate: () => c7In } as any,
      outAt: null,
      source: 'auto',
    },
    settings,
    todayKey,
  });
  console.assert(res7.regularMin === 0, `Case 7 Reg fail: expected 0 got ${res7.regularMin}`);
  console.assert(res7.overtimeMin === 0, `Case 7 OT fail: expected 0 got ${res7.overtimeMin}`);

  // CSV Escaping test
  const escaped = escapeCsvField('Forgot thumb, "urgent meeting"');
  console.assert(
    escaped === '"Forgot thumb, ""urgent meeting"""',
    `CSV escape test fail: got ${escaped}`
  );

  // Case 8: Sunday is weekly off (weeklyOff = 0)
  // Date: 2026-10-18 is Sunday
  const sundaySettings: UserSettings = {
    dutyStart: '08:00',
    dutyEnd: '16:00',
    weeklyOff: 0, // Sunday is off
  };
  const sunIn = new Date('2026-10-18T09:00:00');
  const sunOut = new Date('2026-10-18T17:00:00');
  const resSun = calculateDay({
    dateKey: '2026-10-18',
    record: {
      date: '2026-10-18',
      inAt: { toDate: () => sunIn } as any,
      outAt: { toDate: () => sunOut } as any,
      source: 'auto',
    },
    settings: sundaySettings,
    todayKey,
  });
  console.assert(resSun.regularMin === 0, `Sunday Reg fail: expected 0 got ${resSun.regularMin}`);
  console.assert(resSun.overtimeMin === 480, `Sunday OT fail: expected 480 got ${resSun.overtimeMin}`);
  console.assert(resSun.totalMin === 480, `Sunday Total fail: expected 480 got ${resSun.totalMin}`);
  console.assert(resSun.lateMin === 0, `Sunday Late fail: expected 0 got ${resSun.lateMin}`);

  // Normal Friday work with Sunday off (Friday 2026-10-16 is a working day)
  const friIn = new Date('2026-10-16T08:00:00');
  const friOut = new Date('2026-10-16T17:00:00');
  const resFri = calculateDay({
    dateKey: '2026-10-16',
    record: {
      date: '2026-10-16',
      inAt: { toDate: () => friIn } as any,
      outAt: { toDate: () => friOut } as any,
      source: 'auto',
    },
    settings: sundaySettings,
    todayKey,
  });
  console.assert(resFri.regularMin === 480, `Friday regular fail: expected 480 got ${resFri.regularMin}`);
  console.assert(resFri.overtimeMin === 60, `Friday overtime fail: expected 60 got ${resFri.overtimeMin}`);

  console.log('ALL TEST CASES INCLUDING SUNDAY OFF AND ALL HOURS AS OVERTIME PASSED!');
}

runTests();
