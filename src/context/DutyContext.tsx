import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthContext';
import {
  DayRecord,
  DayMark,
  UserSettings,
  MonthSummary,
  DayDetailItem,
  RecordSource,
  MarkType
} from '../types';
import { DEFAULT_SETTINGS, FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../config';
import {
  getTodayDateKey,
  formatMonthKey,
  formatDateKey,
  parseDateKey
} from '../domain/dateUtils';
import { calculateMonthSummary } from '../domain/calc';
import { buildMonthExport, ExportDataResult } from '../domain/exportBuilder';

export type SyncStatus = 'Synced' | 'Syncing' | 'Offline';

interface UndoState {
  type: 'IN' | 'OUT';
  dateKey: string;
  previousOutAt?: Timestamp | null;
  expiresAt: number;
}

interface DutyContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  currentMonthKey: string;
  setCurrentMonthKey: (monthKey: string) => void;
  recordsMap: Map<string, DayRecord>;
  marksMap: Map<string, DayMark>;
  monthSummary: MonthSummary;
  monthDays: DayDetailItem[];
  todayRecord: DayRecord | undefined;
  todayMark: DayMark | undefined;
  syncStatus: SyncStatus;
  pendingCount: number;
  undoState: UndoState | null;
  punchIn: () => Promise<string>;
  punchOut: () => Promise<string>;
  undoLastPunch: () => Promise<void>;
  clearUndo: () => void;
  saveDayRecord: (
    dateKey: string,
    inDate: Date,
    outDate?: Date | null,
    source?: RecordSource,
    note?: string
  ) => Promise<void>;
  deleteRecord: (dateKey: string) => Promise<void>;
  setMark: (dateKey: string, type: MarkType, note?: string) => Promise<void>;
  removeMark: (dateKey: string) => Promise<void>;
  generateExcelToken: () => Promise<string>;
  regenerateExcelToken: () => Promise<string>;
  revokeExcelToken: () => Promise<void>;
  rebuildExportData: () => Promise<void>;
  lastExportUpdated: Date | null;
  exportLoading: boolean;
}

const DutyContext = createContext<DutyContextType | undefined>(undefined);

function generateSecureToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export const DutyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, refreshProfile } = useAuth();

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [currentMonthKey, setCurrentMonthKey] = useState<string>(() => formatMonthKey(new Date()));
  const [recordsMap, setRecordsMap] = useState<Map<string, DayRecord>>(new Map());
  const [marksMap, setMarksMap] = useState<Map<string, DayMark>>(new Map());

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingWritesCount, setPendingWritesCount] = useState<number>(0);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [lastExportUpdated, setLastExportUpdated] = useState<Date | null>(null);
  const [exportLoading, setExportLoading] = useState<boolean>(false);

  // Network listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Clear undo state after expiry
  useEffect(() => {
    if (!undoState) return;
    const remainingMs = undoState.expiresAt - Date.now();
    if (remainingMs <= 0) {
      setUndoState(null);
      return;
    }
    const timer = setTimeout(() => {
      setUndoState(null);
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [undoState]);

  // Listen to Settings: users/{uid}/settings/main
  useEffect(() => {
    if (!user) return;
    const settingsDocRef = doc(db, 'users', user.uid, 'settings', 'main');

    const unsubscribe = onSnapshot(
      settingsDocRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserSettings;
          if (data.weeklyOff === 5) {
            // Update to Sunday (0) per business rule tweak
            const updated = { ...data, weeklyOff: 0 };
            setSettings(updated);
            setDoc(settingsDocRef, { weeklyOff: 0 }, { merge: true }).catch(console.warn);
          } else {
            setSettings(data);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/settings/main`);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Listen to Month Records & Marks for currentMonthKey
  useEffect(() => {
    if (!user) return;

    const [year, month] = currentMonthKey.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;

    const recordsRef = collection(db, 'users', user.uid, 'records');
    const marksRef = collection(db, 'users', user.uid, 'marks');

    const recordsQuery = query(
      recordsRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    const marksQuery = query(
      marksRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    let recordsPending = 0;
    let marksPending = 0;

    const unsubRecords = onSnapshot(
      recordsQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const newMap = new Map<string, DayRecord>();
        let hasPending = 0;

        snapshot.forEach((docSnap) => {
          if (docSnap.metadata.hasPendingWrites) {
            hasPending++;
          }
          newMap.set(docSnap.id, docSnap.data() as DayRecord);
        });

        recordsPending = hasPending;
        setPendingWritesCount(recordsPending + marksPending);
        setRecordsMap(newMap);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/records`);
      }
    );

    const unsubMarks = onSnapshot(
      marksQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const newMap = new Map<string, DayMark>();
        let hasPending = 0;

        snapshot.forEach((docSnap) => {
          if (docSnap.metadata.hasPendingWrites) {
            hasPending++;
          }
          newMap.set(docSnap.id, docSnap.data() as DayMark);
        });

        marksPending = hasPending;
        setPendingWritesCount(recordsPending + marksPending);
        setMarksMap(newMap);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/marks`);
      }
    );

    return () => {
      unsubRecords();
      unsubMarks();
    };
  }, [user, currentMonthKey]);

  // Check last export updated time if token exists
  useEffect(() => {
    if (!user || !profile?.exportToken) {
      setLastExportUpdated(null);
      return;
    }

    const currentExportRef = doc(db, 'exports', `${profile.exportToken}_current`);
    const unsubscribe = onSnapshot(
      currentExportRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.updatedAt) {
            setLastExportUpdated(data.updatedAt.toDate ? data.updatedAt.toDate() : new Date());
          }
        }
      },
      () => {
        // Ignored if export doc does not exist yet
      }
    );

    return () => unsubscribe();
  }, [user, profile?.exportToken]);

  const syncStatus: SyncStatus = useMemo(() => {
    if (!isOnline) return 'Offline';
    if (pendingWritesCount > 0) return 'Syncing';
    return 'Synced';
  }, [isOnline, pendingWritesCount]);

  // Calculate current month statistics
  const { summary: monthSummary, days: monthDays } = useMemo(() => {
    return calculateMonthSummary(currentMonthKey, recordsMap, marksMap, settings);
  }, [currentMonthKey, recordsMap, marksMap, settings]);

  const todayKey = getTodayDateKey();
  const todayRecord = recordsMap.get(todayKey);
  const todayMark = marksMap.get(todayKey);

  // Helper to trigger background export updates (never blocks UI thread)
  const triggerExportRefresh = (affectedMonthKey: string) => {
    if (!user || !profile?.exportToken) return;
    const token = profile.exportToken;

    // Run in background without awaiting on UI path
    (async () => {
      try {
        const recordsRef = collection(db, 'users', user.uid, 'records');
        const marksRef = collection(db, 'users', user.uid, 'marks');

        const [y, m] = affectedMonthKey.split('-');
        const sDate = `${y}-${m}-01`;
        const eDate = `${y}-${m}-31`;

        const [rSnap, mSnap] = await Promise.all([
          getDocs(query(recordsRef, where('date', '>=', sDate), where('date', '<=', eDate))),
          getDocs(query(marksRef, where('date', '>=', sDate), where('date', '<=', eDate)))
        ]);

        const rMap = new Map<string, DayRecord>();
        rSnap.forEach(d => rMap.set(d.id, d.data() as DayRecord));

        const mMap = new Map<string, DayMark>();
        mSnap.forEach(d => mMap.set(d.id, d.data() as DayMark));

        const exportData = buildMonthExport(affectedMonthKey, rMap, mMap, settings);

        // Write exports/{token}_{YYYY-MM}
        const monthExportRef = doc(db, 'exports', `${token}_${affectedMonthKey}`);
        await setDoc(monthExportRef, {
          uid: user.uid,
          month: affectedMonthKey,
          daysCsv: exportData.daysCsv,
          summaryCsv: exportData.summaryCsv,
          updatedAt: serverTimestamp(),
        });

        // If affected month is current calendar month, also update exports/{token}_current
        const nowMonthKey = formatMonthKey(new Date());
        if (affectedMonthKey === nowMonthKey) {
          const currentExportRef = doc(db, 'exports', `${token}_current`);
          await setDoc(currentExportRef, {
            uid: user.uid,
            month: affectedMonthKey,
            daysCsv: exportData.daysCsv,
            summaryCsv: exportData.summaryCsv,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn('Background export update failed', err);
      }
    })();
  };

  // 1. Settings Update
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user) return;
    const merged: UserSettings = {
      ...settings,
      ...newSettings,
      updatedAt: serverTimestamp() as any,
    };
    setSettings((prev) => ({ ...prev, ...newSettings }));

    const settingsRef = doc(db, 'users', user.uid, 'settings', 'main');
    // Non-blocking firestore write
    setDoc(settingsRef, merged, { merge: true }).catch((err) => {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/settings/main`);
    });

    // Rebuild exports if token exists
    if (profile?.exportToken) {
      triggerExportRefresh(currentMonthKey);
    }
  };

  // 2. Punch IN
  const punchIn = async (): Promise<string> => {
    if (!user) throw new Error('Not logged in');
    const today = getTodayDateKey();
    const nowTimestamp = Timestamp.now();
    const nowDate = nowTimestamp.toDate();

    const recordRef = doc(db, 'users', user.uid, 'records', today);
    const newRecord: Partial<DayRecord> = {
      date: today,
      inAt: nowTimestamp,
      outAt: null,
      source: 'auto',
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    };

    // Optimistically update local map
    setRecordsMap((prev) => {
      const next = new Map(prev);
      next.set(today, { ...newRecord } as DayRecord);
      return next;
    });

    // Non-blocking write to Firestore
    setDoc(recordRef, newRecord, { merge: true }).catch((err) => {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/records/${today}`);
    });

    // Set 10-second undo
    setUndoState({
      type: 'IN',
      dateKey: today,
      expiresAt: Date.now() + 10000,
    });

    // Background export update
    triggerExportRefresh(formatMonthKey(nowDate));

    return today;
  };

  // 3. Punch OUT
  const punchOut = async (): Promise<string> => {
    if (!user) throw new Error('Not logged in');
    const today = getTodayDateKey();
    const nowTimestamp = Timestamp.now();
    const nowDate = nowTimestamp.toDate();

    const recordRef = doc(db, 'users', user.uid, 'records', today);
    const prevRecord = recordsMap.get(today);

    // Optimistically update local map
    if (prevRecord) {
      setRecordsMap((prev) => {
        const next = new Map(prev);
        next.set(today, { ...prevRecord, outAt: nowTimestamp, updatedAt: nowTimestamp });
        return next;
      });
    }

    // Non-blocking update to Firestore
    updateDoc(recordRef, {
      outAt: nowTimestamp,
      updatedAt: serverTimestamp(),
    }).catch((err) => {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/records/${today}`);
    });

    // Set 10-second undo
    setUndoState({
      type: 'OUT',
      dateKey: today,
      previousOutAt: prevRecord?.outAt || null,
      expiresAt: Date.now() + 10000,
    });

    // Background export update
    triggerExportRefresh(formatMonthKey(nowDate));

    return today;
  };

  // 4. Undo Last Punch
  const undoLastPunch = async () => {
    if (!user || !undoState) return;
    const { type, dateKey } = undoState;
    const recordRef = doc(db, 'users', user.uid, 'records', dateKey);

    if (type === 'IN') {
      // Delete record
      setRecordsMap((prev) => {
        const next = new Map(prev);
        next.delete(dateKey);
        return next;
      });
      deleteDoc(recordRef).catch((err) => {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/records/${dateKey}`);
      });
    } else {
      // Revert outAt to null
      setRecordsMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(dateKey);
        if (existing) {
          next.set(dateKey, { ...existing, outAt: null });
        }
        return next;
      });
      updateDoc(recordRef, {
        outAt: null,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/records/${dateKey}`);
      });
    }

    setUndoState(null);
    triggerExportRefresh(dateKey.slice(0, 7));
  };

  const clearUndo = () => {
    setUndoState(null);
  };

  // 5. Save Day Record (Manual or Edited)
  const saveDayRecord = async (
    dateKey: string,
    inDate: Date,
    outDate?: Date | null,
    source: RecordSource = 'manual',
    note = ''
  ) => {
    if (!user) throw new Error('Not logged in');

    // Validation
    const today = getTodayDateKey();
    if (dateKey > today) {
      throw new Error('You cannot add records for future dates');
    }

    if (outDate) {
      if (outDate.getTime() <= inDate.getTime()) {
        throw new Error('OUT time must be after IN time');
      }
      if (formatDateKey(inDate) !== formatDateKey(outDate)) {
        throw new Error('IN and OUT must be on the same date');
      }
    }

    const inTimestamp = Timestamp.fromDate(inDate);
    const outTimestamp = outDate ? Timestamp.fromDate(outDate) : null;

    const recordRef = doc(db, 'users', user.uid, 'records', dateKey);
    const updatedRecord: DayRecord = {
      date: dateKey,
      inAt: inTimestamp,
      outAt: outTimestamp,
      source,
      note: note.slice(0, 200),
      createdAt: recordsMap.get(dateKey)?.createdAt || (serverTimestamp() as any),
      updatedAt: serverTimestamp() as any,
    };

    setRecordsMap((prev) => {
      const next = new Map(prev);
      next.set(dateKey, updatedRecord);
      return next;
    });

    await setDoc(recordRef, updatedRecord, { merge: true });
    triggerExportRefresh(dateKey.slice(0, 7));
  };

  // 6. Delete Record
  const deleteRecord = async (dateKey: string) => {
    if (!user) return;
    const recordRef = doc(db, 'users', user.uid, 'records', dateKey);

    setRecordsMap((prev) => {
      const next = new Map(prev);
      next.delete(dateKey);
      return next;
    });

    await deleteDoc(recordRef);
    triggerExportRefresh(dateKey.slice(0, 7));
  };

  // 7. Set Mark (Leave or Holiday)
  const setMark = async (dateKey: string, type: MarkType, note = '') => {
    if (!user) return;
    const today = getTodayDateKey();
    if (dateKey > today) {
      throw new Error('You cannot add records for future dates');
    }

    const markRef = doc(db, 'users', user.uid, 'marks', dateKey);
    const newMark: DayMark = {
      date: dateKey,
      type,
      note: note.slice(0, 200),
      createdAt: marksMap.get(dateKey)?.createdAt || (serverTimestamp() as any),
      updatedAt: serverTimestamp() as any,
    };

    setMarksMap((prev) => {
      const next = new Map(prev);
      next.set(dateKey, newMark);
      return next;
    });

    await setDoc(markRef, newMark, { merge: true });

    // If Leave, remove any existing attendance record on this day
    if (type === 'leave' && recordsMap.has(dateKey)) {
      await deleteRecord(dateKey);
    }

    triggerExportRefresh(dateKey.slice(0, 7));
  };

  // 8. Remove Mark
  const removeMark = async (dateKey: string) => {
    if (!user) return;
    const markRef = doc(db, 'users', user.uid, 'marks', dateKey);

    setMarksMap((prev) => {
      const next = new Map(prev);
      next.delete(dateKey);
      return next;
    });

    await deleteDoc(markRef);
    triggerExportRefresh(dateKey.slice(0, 7));
  };

  // 9. Excel Export Link Management (TRD 6.2, 7)
  const generateExcelToken = async (): Promise<string> => {
    if (!user) throw new Error('Not logged in');
    if (!isOnline) throw new Error('Connect to the internet to do this');

    setExportLoading(true);
    try {
      const token = generateSecureToken(32);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { exportToken: token });
      await refreshProfile();

      // Write exports for active month and _current
      const exportData = buildMonthExport(currentMonthKey, recordsMap, marksMap, settings);

      await Promise.all([
        setDoc(doc(db, 'exports', `${token}_${currentMonthKey}`), {
          uid: user.uid,
          month: currentMonthKey,
          daysCsv: exportData.daysCsv,
          summaryCsv: exportData.summaryCsv,
          updatedAt: serverTimestamp(),
        }),
        setDoc(doc(db, 'exports', `${token}_current`), {
          uid: user.uid,
          month: currentMonthKey,
          daysCsv: exportData.daysCsv,
          summaryCsv: exportData.summaryCsv,
          updatedAt: serverTimestamp(),
        })
      ]);

      setLastExportUpdated(new Date());
      return token;
    } finally {
      setExportLoading(false);
    }
  };

  const revokeExcelToken = async () => {
    if (!user) throw new Error('Not logged in');
    if (!isOnline) throw new Error('Connect to the internet to do this');

    setExportLoading(true);
    try {
      // Find all exports owned by this uid
      const exportsRef = collection(db, 'exports');
      const q = query(exportsRef, where('uid', '==', user.uid));
      const snaps = await getDocs(q);

      const deletePromises = snaps.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // Clear token on user profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { exportToken: null });
      await refreshProfile();
      setLastExportUpdated(null);
    } finally {
      setExportLoading(false);
    }
  };

  const regenerateExcelToken = async (): Promise<string> => {
    await revokeExcelToken();
    return await generateExcelToken();
  };

  const rebuildExportData = async () => {
    if (!user || !profile?.exportToken) return;
    if (!isOnline) throw new Error('Connect to the internet to do this');

    setExportLoading(true);
    try {
      const token = profile.exportToken;
      // Rebuild current month and write _current
      const exportData = buildMonthExport(currentMonthKey, recordsMap, marksMap, settings);

      await Promise.all([
        setDoc(doc(db, 'exports', `${token}_${currentMonthKey}`), {
          uid: user.uid,
          month: currentMonthKey,
          daysCsv: exportData.daysCsv,
          summaryCsv: exportData.summaryCsv,
          updatedAt: serverTimestamp(),
        }),
        setDoc(doc(db, 'exports', `${token}_current`), {
          uid: user.uid,
          month: currentMonthKey,
          daysCsv: exportData.daysCsv,
          summaryCsv: exportData.summaryCsv,
          updatedAt: serverTimestamp(),
        })
      ]);

      setLastExportUpdated(new Date());
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <DutyContext.Provider
      value={{
        settings,
        updateSettings,
        currentMonthKey,
        setCurrentMonthKey,
        recordsMap,
        marksMap,
        monthSummary,
        monthDays,
        todayRecord,
        todayMark,
        syncStatus,
        pendingCount: pendingWritesCount,
        undoState,
        punchIn,
        punchOut,
        undoLastPunch,
        clearUndo,
        saveDayRecord,
        deleteRecord,
        setMark,
        removeMark,
        generateExcelToken,
        regenerateExcelToken,
        revokeExcelToken,
        rebuildExportData,
        lastExportUpdated,
        exportLoading,
      }}
    >
      {children}
    </DutyContext.Provider>
  );
};

export const useDuty = () => {
  const context = useContext(DutyContext);
  if (!context) throw new Error('useDuty must be used within DutyProvider');
  return context;
};
