// app/(tabs)/fantasy/_layout.tsx
import { Stack } from 'expo-router';

export default function FantasyStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* index.tsx is the tab's main screen */}
      <Stack.Screen name="index" />

      {/* nested routes like player/[id].tsx live in this stack (NOT tabs) */}
      <Stack.Screen name="player/[id]" />
    </Stack>
  );
}
