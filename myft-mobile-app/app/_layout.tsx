// app/_layout.tsx
import { Slot } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { TournamentProvider } from '../context/TournamentContext';

export default function Layout() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <Slot /> {}
      </TournamentProvider>
    </AuthProvider>
  );
}
