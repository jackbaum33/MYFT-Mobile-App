// app.config.ts
import 'dotenv/config';
import { ConfigContext, ExpoConfig } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'myft-mobile-app',
  slug: 'myft-mobile-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'myftmobileapp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,

  ios: {
    supportsTablet: true,
  },

  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
  },

  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },

  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    'expo-font',
  ],

  experiments: {
    typedRoutes: true,
  },

  /**
   * Values you’ll read in your code with `Constants.expoConfig?.extra`
   * These pull from your .env at build/runtime (via `dotenv/config` above).
   */
  extra: {
    // Firebase
    firebaseApiKey: process.env.FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.FIREBASE_APP_ID,
    firebaseMeasurementId: process.env.FIREBASE_MEASUREMENT_ID, // (web only; optional)

    // You can also expose your own app constants here if needed
    environment: process.env.APP_ENV ?? 'development',
  },
});
