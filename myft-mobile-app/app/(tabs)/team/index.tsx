import React from 'react';
import TeamScreen from '../../screens/TeamScreen';
import { Stack } from 'expo-router';

export default function Page() {
  return (
    <>
      {/* This makes the header say “Rosters” instead of “index” */}
      <Stack.Screen options={{ title: 'Teams' }} />
      <TeamScreen />
    </>
  );
}