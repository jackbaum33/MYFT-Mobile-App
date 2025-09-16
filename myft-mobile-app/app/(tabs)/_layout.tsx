// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { useAppFonts } from "../../assets/fonts";
import { AntDesign, Ionicons } from '@expo/vector-icons';
import ProfileButton from '../../utils/ProfileButton';
import { FONT_FAMILIES } from '../../assets/fonts';

const NAVY = '#00274C';
const YELLOW = '#FFCB05';

export default function TabLayout() {
  const fontsLoaded = useAppFonts();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: NAVY, height: 50},
        headerTintColor: YELLOW,
        headerTitleStyle: { color: YELLOW, fontWeight: 'bold', marginTop: -50, textAlign: 'center', marginLeft: 10, fontFamily: FONT_FAMILIES.archivoBlack },
        headerRight: () => <ProfileButton />,
        tabBarActiveTintColor: YELLOW,
        tabBarInactiveTintColor: '#ffffff',
        headerRightContainerStyle: {
          paddingRight: 10,
          marginTop: -50, // ⬆️ nudge up a bit
        },
        tabBarStyle: { backgroundColor: NAVY, borderTopWidth: 0 },
        sceneContainerStyle: { backgroundColor: NAVY },
        tabBarIcon: ({ color, size }) => {
          switch (route.name) {
            case 'index':       return <AntDesign name="home" size={size} color={color} />;
            case 'schedule':    return <AntDesign name="calendar" size={size} color={color} />;
            case 'team':        return <AntDesign name="team" size={size} color={color} />;
            case 'fantasy':     return <Ionicons name="american-football-outline" size={size} color={color} />;
            case 'leaderboard': return <Ionicons name="trophy" size={size} color={color} />;
            default: return null;
          }
        },
      })}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: 'Home', title: '',}} />
      <Tabs.Screen name="schedule" options={{ tabBarLabel: 'Schedule', title: '' }} />
      <Tabs.Screen name="team" options={{ tabBarLabel: 'Teams', title: '' }} />
      <Tabs.Screen name="fantasy" options={{ tabBarLabel: 'Fantasy', title: '' }} />
      <Tabs.Screen name="leaderboard" options={{ tabBarLabel: 'Standings', title: '' }} />
    </Tabs>
  );
}
