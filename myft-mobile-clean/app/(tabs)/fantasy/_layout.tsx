// fantasy/_layout.tsx - Fantasy Stack Navigator
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FantasyIndexScreen from './index';
import PlayerScreen from './player/[id]';

export type FantasyStackParamList = {
  FantasyIndex: undefined;
  Player: { id: string };
};

const Stack = createNativeStackNavigator<FantasyStackParamList>();

export default function FantasyLayout() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#00274C', // Your NAVY color
        },
        headerTintColor: '#FFCB05', // Your YELLOW color
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="FantasyIndex" 
        component={FantasyIndexScreen}
        options={{ 
          title: 'Fantasy',
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