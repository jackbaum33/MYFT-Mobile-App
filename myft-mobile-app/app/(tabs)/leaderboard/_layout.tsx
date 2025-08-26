// app/(tabs)/leaderboard/_layout.tsx
import { Stack } from 'expo-router';
import { FONT_FAMILIES } from '@/assets/fonts';

const NAVY = '#00274C';
const YELLOW = '#FFCB05';

export default function LeaderboardStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: YELLOW,
        headerTitleStyle: { color: YELLOW, fontWeight: 'bold', fontFamily: FONT_FAMILIES.archivoBlack },
        contentStyle: { backgroundColor: NAVY },
      }}
    />
  );
}
