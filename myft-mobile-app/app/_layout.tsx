// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';

import { auth } from '../services/firebaseConfig';
import { getUser } from '../services/users';

import { AuthProvider } from '../context/AuthContext';          // ⬅️ add
import { TournamentProvider } from '../context/TournamentContext';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      const first = Array.isArray(segments) && segments.length > 0 ? segments[0] : undefined;
      const inLogin = first === 'login';

      if (!u) {
        if (!inLogin) router.replace('/login');
        setReady(true);
        return;
      }

      const profile = await getUser(u.uid);
      if (!profile) {
        if (!inLogin) router.replace('/login');
      } else if (inLogin) {
        router.replace('/');
      }
      setReady(true);
    });

    return unsub;
  }, [router, segments]);

  if (!ready) return null;

  return (
    <AuthProvider>
      <TournamentProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#00274C' }}>
          <StatusBar barStyle="light-content" backgroundColor="#001F3F" />
          <Slot />
        </SafeAreaView>
      </TournamentProvider>
    </AuthProvider>
  );
}
