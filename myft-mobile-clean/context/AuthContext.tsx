// context/AuthContext.tsx - Fixed TypeScript errors
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import {
  getUser as getUserDoc,
  updateUserProfile,
  type UserProfile,
} from '../services/users';

export type AppUser = UserProfile;

type UpdateUserInput = Partial<UserProfile>; // Fixed: Removed Pick constraint

type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  loginAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (partial: UpdateUserInput) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uid, setUid] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firebase auth state with comprehensive error handling
  useEffect(() => {
    console.log('🔥 Setting up Firebase auth listener...');
    
    const unsub = onAuthStateChanged(
      auth, 
      async (fbUser) => {
        console.log('🔥 Auth state changed:', fbUser?.uid || 'No user');
        
        try {
          if (!fbUser) {
            console.log('🔥 No Firebase user, clearing state...');
            setUid(null);
            setUser(null);
            setLoading(false);
            return;
          }

          console.log('🔥 Firebase user found, setting UID:', fbUser.uid);
          setUid(fbUser.uid);

          // Try to get user profile with error handling
          try {
            console.log('🔥 Attempting to fetch user profile...');
            const profile = await getUserDoc(fbUser.uid);
            console.log('🔥 Profile fetch result:', profile ? 'Found' : 'Not found');
            setUser(profile ?? null);
          } catch (profileError) {
            console.warn('🔥 Profile fetch failed, but continuing:', profileError);
            setUser(null);
          }
        } catch (authError) {
          console.error('🔥 Critical auth error:', authError);
          setUid(null);
          setUser(null);
        } finally {
          console.log('🔥 Auth state processing complete, setting loading to false');
          setLoading(false);
        }
      },
      (authError) => {
        // Error callback for onAuthStateChanged
        console.error('🔥 Firebase auth listener error:', authError);
        setUid(null);
        setUser(null);
        setLoading(false);
      }
    );

    return () => {
      console.log('🔥 Cleaning up auth listener...');
      unsub();
    };
  }, []);

  // Manually refresh Firestore profile with error handling
  const refresh = async () => {
    if (!uid) {
      console.log('🔥 Refresh called but no UID');
      return;
    }
    
    console.log('🔥 Refreshing user profile...');
    setLoading(true);
    
    try {
      const profile = await getUserDoc(uid);
      setUser(profile ?? null);
      console.log('🔥 Profile refresh successful');
    } catch (error) {
      console.warn('🔥 Profile refresh failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Anonymous session with error handling
  const loginAnonymously = async () => {
    try {
      console.log('🔥 Attempting anonymous login...');
      await signInAnonymously(auth);
      console.log('🔥 Anonymous login successful');
    } catch (error) {
      console.error('🔥 Anonymous login failed:', error);
      throw error;
    }
  };

  // Sign out with error handling
  const logout = async () => {
    try {
      console.log('🔥 Attempting logout...');
      await signOut(auth);
      setUid(null);
      setUser(null);
      console.log('🔥 Logout successful');
    } catch (error) {
      console.error('🔥 Logout failed:', error);
      setUid(null);
      setUser(null);
      throw error;
    }
  };

  // Update user with error handling
  const updateUser = async (partial: UpdateUserInput) => {
    if (!uid) throw new Error('Not authenticated');
    
    try {
      console.log('🔥 Updating user profile...');
      await updateUserProfile(uid, partial);
      setUser((prev) => (prev ? { ...prev, ...partial } : prev));
      console.log('🔥 User profile update successful');
    } catch (error) {
      console.error('🔥 User profile update failed:', error);
      throw error;
    }
  };

  const refreshUser = useCallback(async () => {
    if (auth.currentUser) {
      try {
        console.log('🔥 Refreshing current user...');
        const userData = await getUserDoc(auth.currentUser.uid);
        setUser(userData);
        console.log('🔥 Current user refresh successful');
      } catch (error) {
        console.warn('🔥 Current user refresh failed:', error);
      }
    }
  }, []);

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
    [user, loading, refreshUser]
  );

  console.log('🔥 AuthProvider rendering, loading:', loading, 'user:', user?.uid || 'none');

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};