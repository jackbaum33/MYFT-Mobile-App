// app.config.ts
import 'dotenv/config';
import { ConfigContext, ExpoConfig } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'myft-mobile-app',
  slug: 'myft-mobile-app',
  scheme: 'myftmobileapp',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/MYFT_LOGO.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,

  ios: {
    supportsTablet: true,
    bundleIdentifier: process.env.APP_ENV === 'production'
      ? 'com.yourname.myftmobileapp'
      : 'com.yourname.myftmobileapp.dev',
    buildNumber: process.env.IOS_BUILD_NUMBER ?? '1',

    // ✅ iOS permission strings shown in the system prompts
    infoPlist: {
      NSCameraUsageDescription:
        'We use the camera to capture photos and videos inside the app.',
      NSPhotoLibraryUsageDescription:
        'We need access to your photo library to pick images/videos for account avatar.',
      NSPhotoLibraryAddUsageDescription:
        'We save edited media back to your library when you choose to export.',
    },
  },

  android: {
    package: process.env.APP_ENV === 'production'
      ? 'com.yourname.myftmobileapp'
      : 'com.yourname.myftmobileapp.dev',
    versionCode: Number(process.env.ANDROID_VERSION_CODE ?? 1),
    adaptiveIcon: {
      foregroundImage: './assets/images/MYFT_LOGO.png',
      backgroundColor: '#00274C',
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
        image: './assets/images/MYFT_LOGO.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#00274C',
      },
    ],
    'expo-font',
  ],

  experiments: { typedRoutes: true },

  extra: {
    firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    firebaseMeasurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
    environment: process.env.APP_ENV ?? 'development',

    eas: {
      projectId: '3cded989-9caf-4b3d-99b9-da6bdcd33d7f', // from your EAS link step
    },
  },
});
