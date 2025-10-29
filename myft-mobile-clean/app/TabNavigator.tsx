import React, { useEffect, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import FantasyLayout from './(tabs)/fantasy/_layout';
import LeaderboardLayout from './(tabs)/leaderboard/_layout';
import ScheduleLayout from './(tabs)/schedule/_layout';
import TeamLayout from './(tabs)/team/_layout';
import HomeScreen from './(tabs)/index';
import { RootStackParamList } from './_layout';
import { useTournament } from '../context/TournamentContext';

export type RootTabParamList = {
  Home: undefined;
  Fantasy: undefined;
  Leaderboard: undefined;
  Schedule: undefined;
  Teams: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// Profile button component
function ProfileButton() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Profile')}
      style={{ marginRight: 16 }}
    >
      <Ionicons name="person-circle-outline" size={28} color="#FFCB05" />
    </TouchableOpacity>
  );
}

// Refresh button component with animation feedback
function RefreshButton() {
  const { refreshData } = useTournament();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    if (isRefreshing) return; // Prevent multiple simultaneous refreshes
    
    try {
      setIsRefreshing(true);
      await refreshData();
    } catch (error) {
      console.warn('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleRefresh}
      style={{ marginLeft: 16 }}
      disabled={isRefreshing}
    >
      <Ionicons 
        name="refresh-outline" 
        size={28} 
        color={isRefreshing ? "#FFCB0580" : "#FFCB05"} 
      />
    </TouchableOpacity>
  );
}

// Auto-refresh component that runs every 10 seconds
function AutoRefreshManager() {
  const { refreshData } = useTournament();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Function to start the refresh interval
    const startInterval = () => {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Set up new interval
      intervalRef.current = setInterval(async () => {
        try {
          console.log('[AutoRefresh] Refreshing data...');
          await refreshData();
        } catch (error) {
          console.warn('[AutoRefresh] Failed to refresh:', error);
        }
      }, 10000); // 10 seconds
    };

    // Function to stop the refresh interval
    const stopInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Handle app state changes (pause when app is in background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        console.log('[AutoRefresh] App became active, starting interval');
        startInterval();
        
        // Also do an immediate refresh when coming back to foreground
        refreshData().catch(err => 
          console.warn('[AutoRefresh] Initial refresh failed:', err)
        );
      } else if (nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        console.log('[AutoRefresh] App went to background, stopping interval');
        stopInterval();
      }

      appState.current = nextAppState;
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Start the interval when component mounts
    startInterval();

    // Cleanup on unmount
    return () => {
      stopInterval();
      subscription.remove();
    };
  }, [refreshData]);

  return null; // This component doesn't render anything
}

export default function TabNavigator() {
  return (
    <>
      {/* Auto-refresh manager runs globally */}
      <AutoRefreshManager />
      
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Fantasy') {
              iconName = focused ? 'american-football' : 'american-football-outline';
            } else if (route.name === 'Leaderboard') {
              iconName = focused ? 'trophy' : 'trophy-outline';
            } else if (route.name === 'Schedule') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Teams') {
              iconName = focused ? 'people' : 'people-outline';
            } else {
              iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#FFCB05', // Your YELLOW color
          tabBarInactiveTintColor: '#E9ECEF', // Your TEXT color
          tabBarStyle: {
            backgroundColor: '#00274C', // Your NAVY color
            borderTopColor: 'rgba(255,255,255,0.12)', // Your LINE color
          },
          headerShown: true, // Show header on all tabs
          headerStyle: { 
            backgroundColor: '#00274C',
            shadowOpacity: 0, // Remove shadow on iOS
            elevation: 0, // Remove shadow on Android
          },
          headerTintColor: '#FFCB05',
          headerTitle: '', // Empty title for clean look
          headerLeft: RefreshButton, // Refresh button on the left
          headerRight: ProfileButton, // Profile button on all tabs
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Schedule" component={ScheduleLayout} />
        <Tab.Screen name="Teams" component={TeamLayout} />
        <Tab.Screen name="Fantasy" component={FantasyLayout} />
        <Tab.Screen name="Leaderboard" component={LeaderboardLayout} />
      </Tab.Navigator>
    </>
  );
}