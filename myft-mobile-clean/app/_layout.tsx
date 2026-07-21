import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { userExists } from '../services/users';
import { registerForPushNotifications } from '../services/notifications';
import TabNavigator from './TabNavigator';
import ProfileModal from './(modals)/profile';
import LoginScreen from './login';
import SignInScreen from './signin';
import { TournamentProvider } from '../context/TournamentContext';
import { AuthProvider } from '../context/AuthContext';
import {
  Animated,
  Dimensions,
  Easing,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Version check ───────────────────────────────────────────────────────────

// Compares dotted version strings numerically (e.g. "2.0.10" > "2.0.9").
function isVersionBelow(current: string, minimum: string): boolean {
  const c = current.split('.').map((n) => parseInt(n, 10) || 0);
  const m = minimum.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(c.length, m.length); i++) {
    const cv = c[i] ?? 0;
    const mv = m[i] ?? 0;
    if (cv !== mv) return cv < mv;
  }
  return false;
}

function UpdateRequiredModal({ updateUrl }: { updateUrl?: string }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={updateStyles.backdrop}>
        <View style={updateStyles.card}>
          <Ionicons name="cloud-download-outline" size={48} color="#FFCB05" />
          <Text style={updateStyles.title}>Update Required</Text>
          <Text style={updateStyles.body}>
            A new version of the MYFT app is available. Please update to continue.
          </Text>
          <TouchableOpacity
            style={updateStyles.button}
            disabled={!updateUrl}
            onPress={() => updateUrl && Linking.openURL(updateUrl)}
          >
            <Text style={updateStyles.buttonText}>Update Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const updateStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#00274C',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,203,5,0.3)',
  },
  title: { color: '#FFCB05', fontSize: 20, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  body: { color: '#E9ECEF', fontSize: 14, textAlign: 'center', marginTop: 10, marginBottom: 18 },
  button: { backgroundColor: '#FFCB05', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28 },
  buttonText: { color: '#00274C', fontWeight: '900', fontSize: 15 },
});

export type RootStackParamList = {
  Main: undefined;
  Profile: undefined;
  Login: undefined;
  SignIn: undefined;
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
  // Ref keeps the latest authReady value accessible inside the stale animation closure
  const authReadyRef = useRef(authReady);
  useEffect(() => { authReadyRef.current = authReady; }, [authReady]);

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
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      // 3. Brief pause before fade
      Animated.delay(200),
    ]).start(() => {
      animDoneRef.current = true;
      if (authReadyRef.current) dismiss(); // use ref — closure would capture stale prop
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

  // True parabola: y(t) = 680t² − 680t + 10  →  peaks at −160 when t = 0.5
  const footballY = progress.interpolate({
    inputRange: [0, 1 / 6, 2 / 6, 0.5, 4 / 6, 5 / 6, 1],
    outputRange: [10, -84, -141, -160, -141, -84, 10],
  });

  // 21-point smooth rotation + fading dots — computed once from device width
  const { rotInput, rotOutput, dots } = useMemo(() => {
    // Rotation: exact atan2 angle at every 5% of the flight
    // dy/dt = 1360t − 680  |  dx/dt = total X travel (1.3 × screen width)
    const N_ROT = 30;
    const dxdt = width * 1.3;
    const rotInput = Array.from({ length: N_ROT }, (_, i) => i / (N_ROT - 1));
    const rotOutput = rotInput.map(t => {
      const rad = Math.atan2(1360 * t - 680, dxdt) * 1.15; // scale up for visible tilt
      return `${(rad * 180 / Math.PI).toFixed(2)}deg`;
    });

    // Dots: appear as ball passes, fade out ~0.5 s later
    const N_DOTS = 12;
    const LIFE = 500 / 1400; // 0.5 s expressed as a fraction of the 1400 ms flight
    const dots = Array.from({ length: N_DOTS }, (_, i) => {
      const t = i / (N_DOTS - 1);
      const x = width * 0.65 * (2 * t - 1);
      const y = 680 * t * t - 680 * t + 10;

      // Guarantee strictly-increasing keyframe times even at boundary dots (t=0, t=1)
      const k0 = Math.max(0, t - 0.012);
      const k1 = Math.max(k0 + 0.001, Math.min(1, t));
      const k2 = Math.max(k1 + 0.001, Math.min(1, t + LIFE));
      const k3 = Math.max(k2 + 0.001, Math.min(1, t + LIFE + 0.04));

      const opacity = progress.interpolate({
        inputRange:  [k0,  k1,  k2,  k3],
        outputRange: [0, 0.7, 0.7,   0],
        extrapolate: 'clamp',
      });
      return { x, y, opacity };
    });

    return { rotInput, rotOutput, dots };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const footballRotate = progress.interpolate({
    inputRange: rotInput,
    outputRange: rotOutput,
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.splash, { opacity: splashOpacity }]}>
      <Animated.Image
        source={require('../images/MYFT_APP_LOGO.png')}
        style={[styles.logo, { opacity: logoOpacity }]}
        resizeMode="contain"
      />

      {/* Dashed trail — rendered behind the ball */}
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: '#FFCB05',
            opacity: dot.opacity,
            transform: [{ translateX: dot.x }, { translateY: dot.y }],
          }}
        />
      ))}

      {/* Ball */}
      <Animated.View
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
        <Ionicons name="american-football-outline" size={48} color="#FFCB05" />
      </Animated.View>
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
  const [updateUrl, setUpdateUrl] = useState<string | undefined>(undefined);
  const [updateRequired, setUpdateRequired] = useState(false);
  const notifRegisteredRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'config', 'tournament'));
        const data = snap.data();
        const minAppVersion = data?.minAppVersion;
        const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
        if (minAppVersion && isVersionBelow(currentVersion, minAppVersion)) {
          setUpdateUrl(data?.updateUrl);
          setUpdateRequired(true);
        }
      } catch (e) {
        console.warn('[RootNavigator] version check failed:', e);
      }
    })();
  }, []);

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
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={shouldShowLogin ? 'Login' : 'Main'}
        >
          {shouldShowLogin ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="SignIn" component={SignInScreen} />
            </>
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

      {!splashVisible && updateRequired && <UpdateRequiredModal updateUrl={updateUrl} />}
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
