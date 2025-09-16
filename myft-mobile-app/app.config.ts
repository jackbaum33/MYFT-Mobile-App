// app.config.ts
import 'dotenv/config';
import { ConfigContext, ExpoConfig } from '@expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const profile = process.env.EAS_BUILD_PROFILE ?? 'development';
  const isProd = profile === 'production' || process.env.APP_ENV === 'production';

  return {
    ...config,
    name: 'myft-mobile-app',
    slug: 'myft-mobile-app',
    scheme: 'myftmobileapp',
    version: '1.0.7',
    orientation: 'portrait',
    icon: './assets/images/MYFT_APP_LOGO.png',
    userInterfaceStyle: 'automatic',

    // 👉 Consider turning this OFF until you’ve verified all deps are New Arch safe.
    // newArchEnabled: true,

    // 👉 Add this: stable runtime & updates
    runtimeVersion: { policy: 'appVersion' },
    updates: {
      enabled: true,
      // If you have EXPO_PROJECT_ID, this URL gets auto-filled by the expo-updates plugin.
      // It’s fine to omit if you rely on the plugin; leaving here shows the intent.
      // url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID}`,
      checkAutomatically: 'ON_ERROR_RECOVERY',
      fallbackToCacheTimeout: 0
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.jackbaum.myftmobileapp',
      buildNumber: process.env.IOS_BUILD_NUMBER ?? '1',
      infoPlist: {
        NSCameraUsageDescription:
          'We use the camera to capture photos and videos inside the app.',
        NSPhotoLibraryUsageDescription:
          'We need access to your photo library to pick images/videos for posts.',
        NSPhotoLibraryAddUsageDescription:
          'We save edited media back to your library when you choose to export.',
        NSLocationWhenInUseUsageDescription:
          'We use your location to show nearby events and personalize in-app content.',
      },
    },

    android: {
      package: isProd ? 'com.jackbaum.myftmobileapp' : 'com.jackbaum.myftmobileapp.dev',
      versionCode: Number(process.env.ANDROID_VERSION_CODE ?? 1),
      adaptiveIcon: {
        foregroundImage: './assets/images/MYFT_APP_LOGO.png',
        backgroundColor: '#00274C',
      },
      edgeToEdgeEnabled: true,
    },

    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/MYFT_APP_LOGO.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#00274C',
        },
      ],
      'expo-font',
      // 👉 Ensure expo-updates plugin runs so the embedded update & URL get configured
      'expo-updates',
    ],

    experiments: { typedRoutes: true },

    extra: {
      environment: isProd ? 'production' : 'development',
      eas: { projectId: process.env.EAS_PROJECT_ID as string },
    },
  };
};
