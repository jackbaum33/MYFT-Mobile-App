import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import  LeaderboardScreen from '../screens/LeaderboardScreen';

export default function Page() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user]);

  return user ? <LeaderboardScreen /> : null;
}