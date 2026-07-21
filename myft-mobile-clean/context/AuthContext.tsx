// context/AuthContext.tsx - Fixed TypeScript errors
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  linkWithCredential,
  EmailAuthProvider,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../services/firebaseConfig';
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
  deleteAccount: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (partial: UpdateUserInput) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  emailLinked: boolean;
  email: string | null;
  linkEmailPassword: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uid, setUid] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailLinked, setEmailLinked] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

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
            setEmailLinked(false);
            setEmail(null);
            setLoading(false);
            return;
          }

          console.log('🔥 Firebase user found, setting UID:', fbUser.uid);
          setUid(fbUser.uid);
          setEmailLinked(fbUser.providerData.some((p) => p.providerId === 'password'));
          setEmail(fbUser.email ?? null);

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

  // Permanently delete the account: server-side cleanup (Firestore data,
  // league membership, Storage files, Auth user) via a Cloud Function, then
  // sign out locally so the root navigator's auth listener redirects to Login.
  const deleteAccount = async () => {
    try {
      console.log('🔥 Deleting account...');
      const call = httpsCallable(functions, 'deleteAccount');
      await call();
      await signOut(auth);
      setUid(null);
      setUser(null);
      console.log('🔥 Account deleted');
    } catch (error) {
      console.error('🔥 Account deletion failed:', error);
      throw error;
    }
  };

  // Link the current (anonymous) session to an email/password credential so
  // the same UID — and all its Firestore data — can be recovered on another
  // device via signInWithEmail. Doesn't change the UID, so it won't reliably
  // re-fire onAuthStateChanged; state is synced manually here instead.
  const linkEmailPassword = async (emailInput: string, password: string) => {
    if (!auth.currentUser) throw new Error('Not authenticated');
    try {
      console.log('🔥 Linking email/password...');
      const credential = EmailAuthProvider.credential(emailInput, password);
      await linkWithCredential(auth.currentUser, credential);
      setEmailLinked(true);
      setEmail(auth.currentUser.email ?? emailInput);
      console.log('🔥 Email/password linked');
    } catch (error: any) {
      if (error?.code === 'auth/provider-already-linked') {
        setEmailLinked(true);
        setEmail(auth.currentUser.email ?? emailInput);
        return;
      }
      console.error('🔥 Linking email/password failed:', error);
      throw error;
    }
  };

  // Sign in on a (possibly new) device with a previously-linked email/password.
  // Creates a fresh session under the original UID; onAuthStateChanged does the rest.
  const signInWithEmail = async (emailInput: string, password: string) => {
    try {
      console.log('🔥 Signing in with email...');
      await signInWithEmailAndPassword(auth, emailInput, password);
      console.log('🔥 Email sign-in successful');
    } catch (error) {
      console.error('🔥 Email sign-in failed:', error);
      throw error;
    }
  };

  const resetPassword = async (emailInput: string) => {
    try {
      console.log('🔥 Sending password reset email...');
      await sendPasswordResetEmail(auth, emailInput);
      console.log('🔥 Password reset email sent');
    } catch (error) {
      console.error('🔥 Password reset failed:', error);
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
      deleteAccount,
      refresh,
      refreshUser,
      updateUser,
      updateDisplayName,
      emailLinked,
      email,
      linkEmailPassword,
      signInWithEmail,
      resetPassword,
    }),
    [user, loading, refreshUser, emailLinked, email]
  );

  console.log('🔥 AuthProvider rendering, loading:', loading, 'user:', user?.uid || 'none');

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};