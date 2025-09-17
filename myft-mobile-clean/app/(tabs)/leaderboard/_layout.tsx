// leaderboard/_layout.tsx - React Navigation Version
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FONT_FAMILIES } from '../../../fonts';
import LeaderboardIndexScreen from './index';
import PlayerScreen from './player/[id]';
import UserScreen from './user/[id]';

const NAVY = '#00274C';
const YELLOW = '#FFCB05';

export type LeaderboardStackParamList = {
  LeaderboardIndex: undefined;
  Player: { id: string };
  User: { id: string };
};

const Stack = createNativeStackNavigator<LeaderboardStackParamList>();

export default function LeaderboardStackLayout() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: YELLOW,
        headerTitleStyle: { 
          color: YELLOW, 
          fontWeight: 'bold', 
          fontFamily: FONT_FAMILIES.archivoBlack 
        },
        contentStyle: { backgroundColor: NAVY },
      }}
    >
      <Stack.Screen 
        name="LeaderboardIndex" 
        component={LeaderboardIndexScreen}
        options={{ 
          title: 'Leaderboard',
          headerShown: true 
        }}
      />
      <Stack.Screen 
        name="Player" 
        component={PlayerScreen}
        options={{ 
          title: 'Player Details',
          headerShown: true 
        }}
      />
      <Stack.Screen 
        name="User" 
        component={UserScreen}
        options={{ 
          title: 'User Details',
          headerShown: true 
        }}
      />
    </Stack.Navigator>
  );
}