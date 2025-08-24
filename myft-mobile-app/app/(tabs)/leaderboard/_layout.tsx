// app/(tabs)/leaderboard/_layout.tsx
import { Stack } from 'expo-router';

const NAVY = '#00274C';
const YELLOW = '#FFCB05';

export default function LeaderboardStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: YELLOW,
        headerTitleStyle: { color: YELLOW, fontWeight: 'bold' },
        contentStyle: { backgroundColor: NAVY },
      }}
    />
  );
}
