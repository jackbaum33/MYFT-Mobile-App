// app/_layout.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { getUser } from '../services/users';
import { AuthProvider } from '../context/AuthContext';
import { TournamentProvider } from '../context/TournamentContext';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments(); // [] on first render is normal
  const [ready, setReady] = useState(false);
  const navigatedRef = useRef(false); // prevent double replace

  useEffect(() => {
    let alive = true;

    const go = (path: string) => {
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        try { router.replace(path as any); } catch {}
      }
    };

    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        const first = segments[0] ?? ''; // may be '' at first
        const inLogin = first === 'login';

        if (!u) {
          if (!inLogin) go('/login'); // make sure app/login/index.tsx exists
          return;
        }

        // Robust fetch with catch — never let an exception bubble on launch
        let profile: any = null;
        try {
          profile = await Promise.race([
            getUser(u.uid),
            new Promise((_r, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
          ]);
        } catch (_e) {
          // If profile fetch fails, send them to login (safe default)
          if (!inLogin) go('/login');
          return;
        }

        if (!profile) {
          if (!inLogin) go('/login');
        } else if (inLogin) {
          go('/'); // make sure app/index.tsx (or your home route) exists
        }
      } finally {
        if (alive) setReady(true);
      }
    });

    return () => { alive = false; unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router /* don't depend on segments to avoid re-running unnecessarily */]);

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
