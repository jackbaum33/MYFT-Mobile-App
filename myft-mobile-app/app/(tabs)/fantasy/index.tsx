// app/(tabs)/fantasy/index.tsx
import React from 'react';
import { Stack } from 'expo-router';
import FantasyScreen from '../../screens/FantasyScreen';

export default function FantasyTab() {
  return (
    <>
      <Stack.Screen options={{ title: 'Fantasy' }} />
      <FantasyScreen />
    </>
  );
}
