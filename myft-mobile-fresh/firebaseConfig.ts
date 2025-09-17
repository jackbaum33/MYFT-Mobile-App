// services/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth, 
  //@ts-ignore
  getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANT: env must start with EXPO_PUBLIC_ to be available in the app
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

// Simple auth without custom persistence - Firebase will handle it automatically
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Firestore (force long polling is optional; Expo Go usually works without)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Storage
export const storage = getStorage(app);

// (Optional) Debug
if (__DEV__) {
  const missing = Object.entries(firebaseConfig).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) console.warn('[FIREBASE] Missing EXPO_PUBLIC keys:', missing.join(', '));
}