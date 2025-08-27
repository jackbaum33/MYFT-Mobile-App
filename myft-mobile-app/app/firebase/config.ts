// app/firebase/config.ts
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as {
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId: string;
  firebaseMeasurementId?: string;
};

export const firebaseConfig = {
  apiKey: extra.firebaseApiKey,
  authDomain: extra.firebaseAuthDomain,
  projectId: extra.firebaseProjectId,
  storageBucket: extra.firebaseStorageBucket,
  messagingSenderId: extra.firebaseMessagingSenderId,
  appId: extra.firebaseAppId,
  measurementId: extra.firebaseMeasurementId, // safe to be undefined on native
};
