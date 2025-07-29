import { Stack } from 'expo-router';

export default function TeamStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#001F3F' },
        headerTintColor: '#FFD700',
        headerTitleStyle: { fontWeight: 'bold' },
        contentStyle: { backgroundColor: '#001F3F' }, // screen background for this stack
      }}
    />
  );
}