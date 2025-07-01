import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../../app/screens/HomeScreen';
import TeamScreen from '../../app/screens/TeamScreen';
import ScheduleScreen from '../../app/screens/ScheduleScreen';
import FantasyScreen from '../../app/screens/FantasyScreen';
import LeaderboardScreen from '../../app/screens/LeaderboardScreen';
import GlobalLeaderboardScreen from '../../app/screens/GlobalLeaderboardScreen';
import LoginScreen from '../../app/screens/LoginScreen';
import ProfileScreen from '../../app/screens/ProfileScreen';
import { useAuth } from '../../context/AuthContext';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Team" component={TeamScreen} />
          <Stack.Screen name="Schedule" component={ScheduleScreen} />
          <Stack.Screen name="Fantasy" component={FantasyScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
          <Stack.Screen name="GlobalLeaderboard" component={GlobalLeaderboardScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
