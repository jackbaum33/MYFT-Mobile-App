import { Tabs, Slot } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <View style={styles.screenWrapper}>
      <Tabs
  screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: '#FFD700',
    tabBarInactiveTintColor: '#ffffff',
    tabBarStyle: {
      backgroundColor: '#001F3F',
      borderTopWidth: 0,
    },
    sceneContainerStyle: {
      backgroundColor: '#001F3F', // ← This fixes your issue
    },
    tabBarIcon: ({ color, size }) => {
      switch (route.name) {
        case 'index':
          return <AntDesign name="home" size={size} color={color} />;
        case 'schedule':
          return <AntDesign name="calendar" size={size} color={color} />;
        case 'team':
          return <AntDesign name="team" size={size} color={color} />;
        case 'fantasy':
          return <Ionicons name="american-football-outline" size={size} color={color} />;
        case 'leaderboard':
          return <AntDesign name="Trophy" size={size} color={color} />;
        case 'profile':
          return <Ionicons name="person-circle-outline" size={size} color={color} />;
        default:
          return null;
      }
    },
  })}
>
        <Tabs.Screen name="index" options={{ tabBarLabel: 'Home' }} />
        <Tabs.Screen name="schedule" options={{ tabBarLabel: 'Schedule' }} />
        <Tabs.Screen name="team" options={{ tabBarLabel: 'Rosters' }} />
        <Tabs.Screen name="fantasy" options={{ tabBarLabel: 'Fantasy' }} />
        <Tabs.Screen name="leaderboard" options={{ tabBarLabel: 'Standings' }} />
        <Tabs.Screen name="profile" options={{ tabBarLabel: 'Profile' }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#001F3F',
  },
});
