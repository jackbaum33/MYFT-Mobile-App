import { Stack } from 'expo-router';
import React from 'react';
import { FONT_FAMILIES } from '../../../fonts';

const NAVY = '#00274C';
const YELLOW = '#FFCB05';

export default function PlayerStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: YELLOW,
        headerTitleStyle: { color: YELLOW, fontWeight: 'bold', fontFamily: FONT_FAMILIES.archivoBlack},
        contentStyle: { backgroundColor: NAVY },
      }}
    />
  );
}