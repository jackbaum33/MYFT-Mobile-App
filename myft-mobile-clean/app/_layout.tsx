// app/_layout.tsx - Authentication-aware root layout (restored with safety checks)
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { userExists } from '../services/users';
import TabNavigator from './TabNavigator';
import ProfileModal from './(modals)/profile';
import LoginScreen from './login';
import { TournamentProvider } from '../context/TournamentContext';
import { AuthProvider } from '../context/AuthContext';
import { View, Text, Image } from 'react-native';

export type RootStackParamList = {
  Main: undefined;
  Profile: undefined;
  Login: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const LOGO = require('../images/MYFT_LOGO.png');

function AuthLoadingScreen() {
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#00274C', 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      <Image 
        source={LOGO} 
        style={{ 
          width: '70%', 
          height: 200,
          resizeMode: 'contain'
        }} 
      />
    </View>
  );
}

function AuthErrorScreen({ error, onRetry }: { error: string, onRetry: () => void }) {
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#00274C', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: 20
    }}>
      <Text style={{ 
        color: '#FF6B6B', 
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center'
      }}>
        Authentication Error
      </Text>
      <Text style={{ 
        color: '#E9ECEF', 
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20
      }}>
        {error}
      </Text>
      <Text 
        style={{ 
          color: '#FFCB05', 
          fontSize: 16,
          textDecorationLine: 'underline'
        }}
        onPress={onRetry}
      >
        Retry
      </Text>
    </View>
  );
}

function RootNavigator() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  // Expose the profile check function globally so login can trigger it
  useEffect(() => {
    (global as any).refreshUserProfile = async () => {
      console.log('🔄 Manually refreshing user profile...');
      if (auth.currentUser) {
        await checkUserProfile(auth.currentUser);
      }
    };
    
    return () => {
      delete (global as any).refreshUserProfile;
    };
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
          setIsLoading(false);
        }
      },
      (error: any) => {
        // Auth listener error handler
        console.error('Firebase auth listener error:', error);
        setIsLoading(false);
        setAuthError(error.message || 'Firebase connection failed');
      }
    );

    return unsubscribe;
  }, []);

  const handleRetry = () => {
    setAuthError(null);
    setIsLoading(true);
    // Trigger auth state check again
    if (auth.currentUser) {
      checkUserProfile(auth.currentUser).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  };

  if (authError) {
    return <AuthErrorScreen error={authError} onRetry={handleRetry} />;
  }

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  // Show login if no user or no profile
  const shouldShowLogin = !user || !hasProfile;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {shouldShowLogin ? (
        // Auth stack - only login screen
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        // App stack - main app + modals
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
  );
}

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