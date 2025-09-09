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
    version: '1.0.2',
    orientation: 'portrait',
    icon: './assets/images/MYFT_LOGO.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: isProd
        ? 'com.yourname.myftmobileapp'
        : 'com.yourname.myftmobileapp',
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
      package: isProd
        ? 'com.yourname.myftmobileapp'
        : 'com.yourname.myftmobileapp.dev',
      versionCode: Number(process.env.ANDROID_VERSION_CODE ?? 1),
      adaptiveIcon: {
        foregroundImage: './assets/images/MYFT_LOGO.png',
        backgroundColor: '#00274C',
      },
      edgeToEdgeEnabled: true,
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
      // Keep only non-secret flags here
      environment: isProd ? 'production' : 'development',
      eas: { projectId: process.env.EAS_PROJECT_ID as string },
    },
  };
};
