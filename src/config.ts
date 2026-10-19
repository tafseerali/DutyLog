// DutyLog Configuration
import firebaseConfig from '../firebase-applet-config.json';

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId || '(default)';

export const DEFAULT_SETTINGS = {
  dutyStart: '08:00',
  dutyEnd: '16:00',
  weeklyOff: 0, // 0 = Sunday is off (Mon to Sat are working days)
};
