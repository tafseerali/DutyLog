import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../config';

const SESSION_STORAGE_KEY = 'dutylog_auth_session_v1';
export const REMEMBER_EMAIL_KEY = 'dutylog_remembered_email';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

interface CachedSession {
  uid: string;
  email: string;
  displayName: string;
  expiresAt: number;
  profile?: UserProfile;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  sessionExpiresAt: number | null;
  signIn: (email: string, pass: string, remember30Days?: boolean) => Promise<void>;
  signUp: (name: string, email: string, pass: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Try restoring cached session immediately to prevent flashing login screen on phone reload
  const [cachedSession] = useState<CachedSession | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed: CachedSession = JSON.parse(raw);
      if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
        return parsed;
      }
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore parsing error
    }
    return null;
  });

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(cachedSession?.profile || null);
  const [loading, setLoading] = useState<boolean>(!cachedSession);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(
    cachedSession ? cachedSession.expiresAt : null
  );

  // Helper to persist session for at least 30 days
  const persistSessionLocally = (fbUser: User, userProfile?: UserProfile | null) => {
    const expiresAt = Date.now() + THIRTY_DAYS_MS;
    const sessionData: CachedSession = {
      uid: fbUser.uid,
      email: fbUser.email || '',
      displayName: userProfile?.displayName || fbUser.displayName || 'DutyLog User',
      expiresAt,
      profile: userProfile || undefined,
    };
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      setSessionExpiresAt(expiresAt);
    } catch (e) {
      console.warn('Could not write session to localStorage:', e);
    }
  };

  // Initialize or fetch user profile & default settings
  const fetchOrCreateProfile = async (firebaseUser: User, customName?: string) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
        persistSessionLocally(firebaseUser, data);
      } else {
        const newProfile: UserProfile = {
          displayName: customName || firebaseUser.displayName || 'DutyLog User',
          email: firebaseUser.email || '',
          createdAt: serverTimestamp() as any,
          exportToken: null,
        };
        await setDoc(userDocRef, newProfile);
        setProfile(newProfile);

        // Also create default settings
        const settingsRef = doc(db, 'users', firebaseUser.uid, 'settings', 'main');
        const defaultSettings: UserSettings = {
          ...DEFAULT_SETTINGS,
          updatedAt: serverTimestamp() as any,
        };
        await setDoc(settingsRef, defaultSettings);
        persistSessionLocally(firebaseUser, newProfile);
      }
    } catch (error) {
      console.warn('Could not fetch user profile immediately, using fallback', error);
      const fallback: UserProfile = {
        displayName: customName || firebaseUser.displayName || 'DutyLog User',
        email: firebaseUser.email || '',
        exportToken: null,
      };
      setProfile(fallback);
      persistSessionLocally(firebaseUser, fallback);
    }
  };

  useEffect(() => {
    // Ensure persistence is active
    setPersistence(auth, browserLocalPersistence).catch(() => {
      setPersistence(auth, indexedDBLocalPersistence).catch(console.warn);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchOrCreateProfile(currentUser);
      } else {
        // If Firebase says no user, check if we had a non-expired cached session
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
          try {
            const parsed: CachedSession = JSON.parse(raw);
            if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
              // Session is still valid for the month
              // Don't log out immediately unless user explicitly logged out
            } else {
              localStorage.removeItem(SESSION_STORAGE_KEY);
              setUser(null);
              setProfile(null);
              setSessionExpiresAt(null);
            }
          } catch {
            setUser(null);
            setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
          setSessionExpiresAt(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string, remember30Days = true) => {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      await setPersistence(auth, indexedDBLocalPersistence).catch(console.warn);
    }

    const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
    if (remember30Days) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
    }
    if (res.user) {
      setUser(res.user);
      persistSessionLocally(res.user);
      await fetchOrCreateProfile(res.user);
    }
  };

  const signUp = async (name: string, email: string, pass: string) => {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      await setPersistence(auth, indexedDBLocalPersistence).catch(console.warn);
    }

    const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
    if (res.user) {
      setUser(res.user);
      await updateProfile(res.user, { displayName: name.trim() });
      await fetchOrCreateProfile(res.user, name.trim());
    }
  };

  const signInGoogle = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      await setPersistence(auth, indexedDBLocalPersistence).catch(console.warn);
    }

    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    if (res.user) {
      setUser(res.user);
      persistSessionLocally(res.user);
      await fetchOrCreateProfile(res.user);
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Error signing out:', e);
    }
    setUser(null);
    setProfile(null);
    setSessionExpiresAt(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const updateName = async (name: string) => {
    if (!user) return;
    await updateProfile(user, { displayName: name.trim() });
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, { displayName: name.trim() }, { merge: true });
      setProfile((prev) => {
        const next = prev ? { ...prev, displayName: name.trim() } : null;
        if (next && user) persistSessionLocally(user, next);
        return next;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    await fetchOrCreateProfile(user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        sessionExpiresAt,
        signIn,
        signUp,
        signInGoogle,
        signOut,
        resetPassword,
        updateName,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
