// team/_layout.tsx - React Navigation Version
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FONT_FAMILIES } from '../../../fonts';
import TeamIndexScreen from './index';
import TeamDetailScreen from './[id]';
import PlayerScreen from './player/[id]';

const NAVY = '#00274C';
const YELLOW = '#FFCB05';

export type TeamStackParamList = {
  TeamIndex: undefined;
  TeamDetail: { id: string };
  Player: { id: string };
};

const Stack = createNativeStackNavigator<TeamStackParamList>();

export default function TeamStackLayout() {
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
        name="TeamIndex" 
        component={TeamIndexScreen}
        options={{ 
          title: 'Teams',
          headerShown: true 
        }}
      />
      <Stack.Screen 
        name="TeamDetail" 
        component={TeamDetailScreen}
        options={{ 
          title: 'Team Details',
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
    </Stack.Navigator>
  );
}