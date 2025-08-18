// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  username: string;
  displayName: string;
  points?: number;
  photoUri?: string;            // 👈 NEW: optional profile photo
}

type UpdateUserInput = Partial<Pick<User, 'username' | 'displayName' | 'photoUri' | 'points'>>;

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  login: (username: string, displayName: string) => void | Promise<void>;
  logout: () => void | Promise<void>;

  // Existing methods kept for compatibility
  updateDisplayName: (displayName: string) => void | Promise<void>;
  updatePoints: (points: number) => void | Promise<void>;

  // NEW: flexible update for username/displayName/photoUri/points
  updateUser: (partial: UpdateUserInput) => void | Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// TODO: replace with your deployed API base
const BACKEND_URL = 'http://localhost:5000/api/users';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('currentUser');
      const users = await AsyncStorage.getItem('allUsers');
      if (stored) setUser(JSON.parse(stored));
      if (users) setAllUsers(JSON.parse(users));
    };
    load();
  }, []);

  const persistCurrentUser = async (u: User | null) => {
    if (u) {
      await AsyncStorage.setItem('currentUser', JSON.stringify(u));
    } else {
      await AsyncStorage.removeItem('currentUser');
    }
  };

  const persistAllUsers = async (list: User[]) => {
    await AsyncStorage.setItem('allUsers', JSON.stringify(list));
  };

  const syncToBackend = async (userData: User) => {
    try {
      await fetch(`${BACKEND_URL}/${encodeURIComponent(userData.username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
    } catch (err) {
      console.error('Failed to sync user:', err);
    }
  };

  const login = async (username: string, displayName: string) => {
    const newUser: User = { username, displayName, points: 0, photoUri: undefined };
    setUser(newUser);
    await persistCurrentUser(newUser);

    const updatedUsers = [...allUsers.filter(u => u.username !== username), newUser];
    setAllUsers(updatedUsers);
    await persistAllUsers(updatedUsers);

    syncToBackend(newUser);
  };

  const logout = async () => {
    setUser(null);
    await persistCurrentUser(null);
  };

  const updateUser = async (partial: UpdateUserInput) => {
    if (!user) return;

    const oldUsername = user.username;
    const newUser: User = { ...user, ...partial };

    // Update current user state/storage
    setUser(newUser);
    await persistCurrentUser(newUser);

    // Update the allUsers list (handle username changes)
    let nextAll = allUsers;

    // remove old entry
    nextAll = nextAll.filter(u => u.username !== oldUsername);
    // add/replace with new entry
    nextAll = [...nextAll, newUser];

    setAllUsers(nextAll);
    await persistAllUsers(nextAll);

    syncToBackend(newUser);
  };

  // Backwards-compatible helpers
  const updateDisplayName = async (displayName: string) => updateUser({ displayName });
  const updatePoints = async (points: number) => updateUser({ points });

  return (
    <AuthContext.Provider
      value={{
        user,
        allUsers,
        login,
        logout,
        updateDisplayName,
        updatePoints,
        updateUser,          // 👈 expose new method
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
