import React, { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUser } from '../services/users';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      // Are we on the login route already?
      const inLogin = segments[0] === 'login'; // since app/login.tsx -> '/login'

      if (!u) {
        // No auth → send to login
        if (!inLogin) router.replace('/login');
        setReady(true);
        return;
      }

      // Have auth, ensure profile exists
      const profile = await getUser(u.uid);
      if (!profile) {
        if (!inLogin) router.replace('/login');
      } else {
        // If user is on /login but already has a profile, take them to app
        if (inLogin) router.replace('/');
      }
      setReady(true);
    });
    return unsub;
  }, [router, segments]);

  if (!ready) return null;
  return <Slot />;
}
