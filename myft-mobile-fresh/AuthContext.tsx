// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';
import {
  getUser as getUserDoc,
  updateUserProfile,
  type UserProfile,
} from './users';

/** Keep the alias if you want this name elsewhere */
export type AppUser = UserProfile;

type UpdateUserInput = Partial<
  Pick<UserProfile, 'displayName' | 'username' | 'photoUrl' | 'boys_roster' | 'girls_roster'>
>;

type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;

  // session
  loginAnonymously: () => Promise<void>;
  logout: () => Promise<void>;

  // profile
  refresh: () => Promise<void>;
  updateUser: (partial: UpdateUserInput) => Promise<void>;
  refreshUser: () => Promise<void>;
  // back-compat
  updateDisplayName: (displayName: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uid, setUid] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
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

        // Pull the profile doc if it exists (your Login screen creates it if missing)
        const profile = await getUserDoc(fbUser.uid);
        setUser(profile ?? null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  

  // Manually refresh Firestore profile
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

  // Anonymous session
  const loginAnonymously = async () => {
    await signInAnonymously(auth);
    // onAuthStateChanged will update state
  };

  // Sign out and clear local state
  const logout = async () => {
    await signOut(auth);
    setUid(null);
    setUser(null);
  };

  // Merge-update profile
  const updateUser = async (partial: UpdateUserInput) => {
    if (!uid) throw new Error('Not authenticated');
    await updateUserProfile(uid, partial);
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const refreshUser = useCallback(async () => {
    if (auth.currentUser) {
      const userData = await getUserDoc(auth.currentUser.uid);
      setUser(userData);
    }
  }, []);

  // Back-compat helper
  const updateDisplayName = (displayName: string) => updateUser({ displayName });

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      loginAnonymously,
      logout,
      refresh,
      refreshUser,
      updateUser,
      updateDisplayName,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
