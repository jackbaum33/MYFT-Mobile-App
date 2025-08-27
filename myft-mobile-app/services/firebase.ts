// services/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import Constants from 'expo-constants';

const firebaseConfig = Constants.expoConfig?.extra?.firebase;

if (!firebaseConfig?.apiKey) {
  console.warn('Firebase config missing. Did you set .env and app.config.ts?');
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Optional: better caching for Firestore in RN
let db = getFirestore(app);
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  // ignore if already initialized
}

export const auth = getAuth(app);
export { db, app };
