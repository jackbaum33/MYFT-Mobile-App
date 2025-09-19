import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
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
  Team: undefined;
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

// Refresh button component
function RefreshButton() {
  const { refreshData } = useTournament();
  
  const handleRefresh = async () => {
    try {
      await refreshData();
    } catch (error) {
      console.warn('Failed to refresh data:', error);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleRefresh}
      style={{ marginLeft: 16 }}
    >
      <Ionicons name="refresh-outline" size={28} color="#FFCB05" />
    </TouchableOpacity>
  );
}

export default function TabNavigator() {
  return (
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
          } else if (route.name === 'Team') {
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
      <Tab.Screen name="Team" component={TeamLayout} />
      <Tab.Screen name="Fantasy" component={FantasyLayout} />
      <Tab.Screen name="Leaderboard" component={LeaderboardLayout} />
    </Tab.Navigator>
  );
}