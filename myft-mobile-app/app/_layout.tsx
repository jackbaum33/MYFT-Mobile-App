import { Slot } from 'expo-router';
import { StatusBar } from 'react-native';
import { AuthProvider } from '../context/AuthContext';
import { TournamentProvider } from '../context/TournamentContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function Layout() {
  return (
    <SafeAreaProvider>
    <AuthProvider>
      <TournamentProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#001F3F' }}>
        <StatusBar barStyle="light-content" backgroundColor="#001F3F" />
          <Slot />
        </SafeAreaView>
      </TournamentProvider>
    </AuthProvider>
  </SafeAreaProvider>
  );
}
