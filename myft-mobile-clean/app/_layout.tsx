// app/_layout.tsx - Authentication-aware root layout
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
import { View, Text, ActivityIndicator } from 'react-native';

export type RootStackParamList = {
  Main: undefined;
  Profile: undefined;
  Login: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AuthLoadingScreen() {
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#00274C', 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      <ActivityIndicator size="large" color="#FFCB05" />
      <Text style={{ 
        color: '#FFCB05', 
        marginTop: 16, 
        fontSize: 16 
      }}>
        Loading...
      </Text>
    </View>
  );
}

function RootNavigator() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  const checkUserProfile = async (firebaseUser: any) => {
    if (firebaseUser) {
      console.log('👤 User UID:', firebaseUser.uid);
      const profileExists = await userExists(firebaseUser.uid);
      console.log('📋 Profile exists:', profileExists);
      
      setUser(firebaseUser);
      setHasProfile(profileExists);
    } else {
      console.log('❌ No user found');
      setUser(null);
      setHasProfile(false);
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔄 Auth state changed:', firebaseUser ? 'User signed in' : 'User signed out');
      
      try {
        await checkUserProfile(firebaseUser);
      } catch (error) {
        console.warn('Auth state change error:', error);
        setUser(null);
        setHasProfile(false);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

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
          
          {/* Modal screens */}
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