// app/(tabs)/leaderboard/_layout.tsx
import { Stack } from 'expo-router';

export default function LeaderboardStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#001F3F' },
        headerTintColor: '#FFD700',
        headerTitleStyle: { color: '#FFD700', fontWeight: 'bold' },
        contentStyle: { backgroundColor: '#001F3F' },
      }}
    />
  );
}
