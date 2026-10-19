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
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../config';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (name: string, email: string, pass: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize or fetch user profile & default settings
  const fetchOrCreateProfile = async (firebaseUser: User, customName?: string) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setProfile(data);
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
      }
    } catch (error) {
      console.warn('Could not fetch user profile immediately, using fallback', error);
      setProfile({
        displayName: customName || firebaseUser.displayName || 'DutyLog User',
        email: firebaseUser.email || '',
        exportToken: null,
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchOrCreateProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), pass);
  };

  const signUp = async (name: string, email: string, pass: string) => {
    const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (res.user) {
      await updateProfile(res.user, { displayName: name.trim() });
      await fetchOrCreateProfile(res.user, name.trim());
    }
  };

  const signInGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    if (res.user) {
      await fetchOrCreateProfile(res.user);
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setUser(null);
    setProfile(null);
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
      setProfile((prev) => prev ? { ...prev, displayName: name.trim() } : null);
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
