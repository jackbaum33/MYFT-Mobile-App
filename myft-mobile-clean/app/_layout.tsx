import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { userExists } from '../services/users';
import { registerForPushNotifications } from '../services/notifications';
import TabNavigator from './TabNavigator';
import ProfileModal from './(modals)/profile';
import LoginScreen from './login';
import { TournamentProvider } from '../context/TournamentContext';
import { AuthProvider } from '../context/AuthContext';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type RootStackParamList = {
  Main: undefined;
  Profile: undefined;
  Login: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── Animated splash overlay ────────────────────────────────────────────────

function AnimatedSplash({
  authReady,
  onFinished,
}: {
  authReady: boolean;
  onFinished: () => void;
}) {
  const { width } = Dimensions.get('window');
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const dismissedRef = useRef(false);
  const animDoneRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => onFinished());
  }, [onFinished, splashOpacity]);

  // Play the animation sequence on mount
  useEffect(() => {
    Animated.sequence([
      // 1. Logo fades in
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 2. Football flies across
      Animated.timing(progress, {
        toValue: 1,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      // 3. Brief pause before fade
      Animated.delay(200),
    ]).start(() => {
      animDoneRef.current = true;
      if (authReady) dismiss();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // If auth resolves after the animation finishes, dismiss immediately
  useEffect(() => {
    if (authReady && animDoneRef.current) dismiss();
  }, [authReady, dismiss]);

  const footballX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.65, width * 0.65],
  });
  const footballY = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [20, -140, 20],
  });
  const footballRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-30deg', '30deg'],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.splash, { opacity: splashOpacity }]}>
      <Animated.Image
        source={require('../images/MYFT_APP_LOGO.png')}
        style={[styles.logo, { opacity: logoOpacity }]}
        resizeMode="contain"
      />
      <Animated.Text
        style={[
          styles.football,
          {
            transform: [
              { translateX: footballX },
              { translateY: footballY },
              { rotate: footballRotate },
            ],
          },
        ]}
      >
        🏈
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splash: {
    backgroundColor: '#00274C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 240,
    height: 240,
  },
  football: {
    position: 'absolute',
    fontSize: 48,
  },
});

// ─── Error screen ────────────────────────────────────────────────────────────

function AuthErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#00274C', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ color: '#FF6B6B', fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
        Authentication Error
      </Text>
      <Text style={{ color: '#E9ECEF', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
        {error}
      </Text>
      <Text style={{ color: '#FFCB05', fontSize: 16, textDecorationLine: 'underline' }} onPress={onRetry}>
        Retry
      </Text>
    </View>
  );
}

// ─── Root navigator ──────────────────────────────────────────────────────────

function RootNavigator() {
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [splashVisible, setSplashVisible] = useState(true);
  const notifRegisteredRef = useRef(false);

  const checkUserProfile = async (firebaseUser: any) => {
    if (firebaseUser) {
      console.log('👤 User UID:', firebaseUser.uid);
      try {
        const profileExists = await userExists(firebaseUser.uid);
        console.log('📋 Profile exists:', profileExists);
        setUser(firebaseUser);
        setHasProfile(profileExists);
        setAuthError(null);
      } catch (error) {
        console.warn('Profile check error:', error);
        setAuthError('Failed to check user profile');
      }
    } else {
      console.log('❌ No user found');
      setUser(null);
      setHasProfile(false);
      setAuthError(null);
    }
  };

  useEffect(() => {
    (global as any).refreshUserProfile = async () => {
      console.log('🔄 Manually refreshing user profile...');
      if (auth.currentUser) await checkUserProfile(auth.currentUser);
    };
    return () => { delete (global as any).refreshUserProfile; };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        console.log('🔄 Auth state changed:', firebaseUser ? 'User signed in' : 'User signed out');
        try {
          await checkUserProfile(firebaseUser);
        } catch (error: any) {
          console.warn('Auth state change error:', error);
          setUser(null);
          setHasProfile(false);
          setAuthError(error.message || 'Authentication failed');
        } finally {
          setAuthReady(true);
        }
      },
      (error: any) => {
        console.error('Firebase auth listener error:', error);
        setAuthReady(true);
        setAuthError(error.message || 'Firebase connection failed');
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && hasProfile && !notifRegisteredRef.current) {
      notifRegisteredRef.current = true;
      registerForPushNotifications(user.uid).catch(() => {});
    }
  }, [user, hasProfile]);

  const handleRetry = () => {
    setAuthError(null);
    setAuthReady(false);
    if (auth.currentUser) {
      checkUserProfile(auth.currentUser).finally(() => setAuthReady(true));
    } else {
      setAuthReady(true);
    }
  };

  const shouldShowLogin = !user || !hasProfile;

  return (
    <View style={{ flex: 1 }}>
      {/* Navigator renders underneath the splash so the correct screen is ready when splash fades */}
      {authError ? (
        <AuthErrorScreen error={authError} onRetry={handleRetry} />
      ) : authReady ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {shouldShowLogin ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Main" component={TabNavigator} />
              <Stack.Group screenOptions={{ presentation: 'modal' }}>
                <Stack.Screen
                  name="Profile"
                  component={ProfileModal}
                  options={{
                    headerShown: true,
                    title: 'Profile',
                    headerStyle: { backgroundColor: '#00274C' },
                    headerTintColor: '#FFCB05',
                  }}
                />
              </Stack.Group>
            </>
          )}
        </Stack.Navigator>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#00274C' }} />
      )}

      {splashVisible && (
        <AnimatedSplash
          authReady={authReady}
          onFinished={() => setSplashVisible(false)}
        />
      )}
    </View>
  );
}

// ─── Root layout ─────────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#00274C" />
          <RootNavigator />
        </NavigationContainer>
      </TournamentProvider>
    </AuthProvider>
  );
}
