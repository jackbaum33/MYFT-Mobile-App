// schedule/_layout.tsx - React Navigation Version
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FONT_FAMILIES } from '../../../fonts';
import ScheduleIndexScreen from './index';
import ScheduleDetailScreen from './[id]';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';

export type ScheduleStackParamList = {
  ScheduleIndex: undefined;
  ScheduleDetail: { id: string };
};

const Stack = createNativeStackNavigator<ScheduleStackParamList>();

export default function ScheduleStackLayout() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: NAVY,
        headerTitleStyle: { 
          color: YELLOW, 
          fontWeight: 'bold', 
          fontFamily: FONT_FAMILIES.archivoBlack 
        },
        contentStyle: { backgroundColor: NAVY },
      }}
    >
      <Stack.Screen 
        name="ScheduleIndex" 
        component={ScheduleIndexScreen}
        options={{ 
          title: 'Schedule',
          headerShown: true 
        }}
      />
      <Stack.Screen 
        name="ScheduleDetail" 
        component={ScheduleDetailScreen}
        options={{ 
          title: 'Game Details',
          headerShown: true 
        }}
      />
    </Stack.Navigator>
  );
}