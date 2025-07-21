// app/_layout.tsx
import { Slot } from 'expo-router';
import { StatusBar } from 'react-native';
import { AuthProvider } from '../context/AuthContext';
import { TournamentProvider } from '../context/TournamentContext';

export default function Layout() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />
      <AuthProvider>
        <TournamentProvider>
          <Slot />
        </TournamentProvider>
      </AuthProvider>
    </>
  );
}
