import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
      }}
    />
  );
}

<Tabs
  screenOptions={({ route }) => ({
    headerShown: false,
    tabBarIcon: ({ color, size }) => {
      // Add logic for icons here (optional)
      return null;
    },
    tabBarLabel: route.name === 'index' ? 'Home' : route.name.charAt(0).toUpperCase() + route.name.slice(1),
    tabBarActiveTintColor: '#007AFF',
  })}
/>