// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { auth } from '@/services/firebaseConfig'; // or '../services/firebaseConfig' if that's your path
import {
  getUser as getUserDoc,
  createUserProfile,
  updateUserProfile,
} from '@/services/users';

/** ---------- Types (match your Firestore users collection) ---------- */
export type AppUser = {
  uid: string;
  displayName: string;
  username: string;
  photoUrl?: string;           // stored URL in storage (optional)
  boys_roster: string[];       // array of player IDs
  girls_roster: string[];      // array of player IDs
  points?: number;             // optional if you still track it
};

type UpdateUserInput = Partial<
  Pick<AppUser, 'displayName' | 'username' | 'photoUrl' | 'boys_roster' | 'girls_roster' | 'points'>
>;

type AuthContextType = {
  /** Firebase-authenticated user profile from Firestore (or null while logged out / not created yet) */
  user: AppUser | null;
  /** True while we’re resolving auth state or fetching the profile the first time */
  loading: boolean;

  /** Session actions */
  loginAnonymously: () => Promise<void>;
  logout: () => Promise<void>;

  /** Profile actions */
  refresh: () => Promise<void>;
  updateUser: (partial: UpdateUserInput) => Promise<void>;

  /** Back-compat helpers used in older screens */
  updateDisplayName: (displayName: string) => Promise<void>;
  updatePoints: (points: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** ---------- Provider ---------- */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uid, setUid] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          setUid(null);
          setUser(null);
          setLoading(false);
          return;
        }
        setUid(fbUser.uid);

        // Pull the profile doc if it exists (login screen creates it if missing)
        const profile = await getUserDoc(fbUser.uid);
        setUser(profile ?? null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  /** Manual refresh of Firestore profile (use after updates or if another screen changed it) */
  const refresh = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const profile = await getUserDoc(uid);
      setUser(profile ?? null);
    } finally {
      setLoading(false);
    }
  };

  /** Start an anonymous session (your Login screen then creates the user doc) */
  const loginAnonymously = async () => {
    await signInAnonymously(auth);
    // onAuthStateChanged will run and set uid/user
  };

  /** Sign out and clear local state */
  const logout = async () => {
    await signOut(auth);
    setUid(null);
    setUser(null);
  };

  /** Update profile doc in Firestore and mirror to local state */
  const updateUser = async (partial: UpdateUserInput) => {
    if (!uid) throw new Error('Not authenticated');
    await updateUserProfile(uid, partial);
    // merge locally for immediate UI response
    setUser((prev) => (prev ? { ...prev, ...partial } as AppUser : prev));
  };

  /** Backwards-compat helpers */
  const updateDisplayName = (displayName: string) => updateUser({ displayName });
  const updatePoints = (points: number) => updateUser({ points });

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      loginAnonymously,
      logout,
      refresh,
      updateUser,
      updateDisplayName,
      updatePoints,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** ---------- Hook ---------- */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
