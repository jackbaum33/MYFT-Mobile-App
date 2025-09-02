// services/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Firebase config (EXPO_PUBLIC_* must be set) ---
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

// --- Firestore (long polling helps on strict networks) ---
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// --- Storage ---
export const storage = getStorage(app);

// --- Auth with RN persistence (must run in custom dev client / prebuilt app) ---
let auth: import('firebase/auth').Auth;

(function initAuthStrict() {
  try {
    // Dynamically require the RN build to avoid TS/Metro subpath resolution issues
    // @ts-ignore - subpath types aren’t always picked up by TS
    const rnAuth = require('firebase/auth/react-native') as {
      initializeAuth: typeof import('firebase/auth').initializeAuth;
      getReactNativePersistence: (store: any) => any;
    };

    auth = rnAuth.initializeAuth(app, {
      persistence: rnAuth.getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    // If we end up here, you’re likely running in Expo Go OR Metro can’t resolve the subpath.
    // Since you *require* RN persistence, we throw with an actionable message.
    console.error(
      '[FIREBASE AUTH] Failed to load RN adapter. ' +
      'RN persistence requires a custom dev client or prebuilt app, and the package path ' +
      '`firebase/auth/react-native` must resolve. See the notes below.'
    );
    throw e;
  }
})();

export { auth };

// Debug (remove once confirmed)
console.log('[FIREBASE] projectId:', firebaseConfig.projectId);
