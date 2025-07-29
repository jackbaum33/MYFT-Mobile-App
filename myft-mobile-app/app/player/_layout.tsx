import { Stack } from 'expo-router';

export default function PlayerStackLayout() {
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
