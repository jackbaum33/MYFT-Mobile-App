// services/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// TEMP: see which envs exist at bundle time
console.log('[ENV] keys seen:', Object.keys(process.env || {}).filter(k => k.startsWith('EXPO_PUBLIC')));

// Helpful warning if anything missing
const missing = Object.entries(firebaseConfig).filter(([,v]) => !v).map(([k]) => k);
if (missing.length) {
  console.warn('[FIREBASE] Missing EXPO_PUBLIC env keys:', missing.join(', '));
}

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig as any);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

console.log('[FIREBASE] projectId:', firebaseConfig.projectId);
