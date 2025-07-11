import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Home',
        }}
      />
        <Tabs.Screen
        name="fantasy"
        options={{
          tabBarLabel: 'My Roster',
        }}
      />
        <Tabs.Screen
        name="leaderboard"
        options={{
          tabBarLabel: 'Standings',
        }}
      />
        <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'My Profile',
        }}
      />
        <Tabs.Screen
        name="schedule"
        options={{
          tabBarLabel: 'Team Schedule',
        }}
      />
        <Tabs.Screen
        name="team"
        options={{
          tabBarLabel: 'Rosters',
        }}
      />
    </Tabs>
  );
}
