// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  username: string;
  displayName: string;
  points?: number;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, displayName: string) => void;
  logout: () => void;
  updateDisplayName: (displayName: string) => void;
  updatePoints: (points: number) => void;
  allUsers: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const BACKEND_URL = 'http://localhost:5000/api/users'; // or your deployed API URL

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem('currentUser');
      const users = await AsyncStorage.getItem('allUsers');
      if (stored) setUser(JSON.parse(stored));
      if (users) setAllUsers(JSON.parse(users));
    };
    loadUser();
  }, []);

  const syncToBackend = async (userData: User) => {
    try {
      await fetch(`${BACKEND_URL}/${userData.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
    } catch (err) {
      console.error('Failed to sync user:', err);
    }
  };

  const login = async (username: string, displayName: string) => {
    const newUser: User = { username, displayName, points: 0 };
    setUser(newUser);
    await AsyncStorage.setItem('currentUser', JSON.stringify(newUser));

    const updatedUsers = [...allUsers.filter(u => u.username !== username), newUser];
    setAllUsers(updatedUsers);
    await AsyncStorage.setItem('allUsers', JSON.stringify(updatedUsers));

    syncToBackend(newUser);
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('currentUser');
  };

  const updateDisplayName = async (displayName: string) => {
    if (!user) return;
    const updatedUser = { ...user, displayName };
    setUser(updatedUser);
    await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));

    const updatedUsers = allUsers.map(u => u.username === user.username ? updatedUser : u);
    setAllUsers(updatedUsers);
    await AsyncStorage.setItem('allUsers', JSON.stringify(updatedUsers));

    syncToBackend(updatedUser);
  };

  const updatePoints = async (points: number) => {
    if (!user) return;
    const updatedUser = { ...user, points };
    setUser(updatedUser);
    await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));

    const updatedUsers = allUsers.map(u => u.username === user.username ? updatedUser : u);
    setAllUsers(updatedUsers);
    await AsyncStorage.setItem('allUsers', JSON.stringify(updatedUsers));

    syncToBackend(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateDisplayName, updatePoints, allUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
