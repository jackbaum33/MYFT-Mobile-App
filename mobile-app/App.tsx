// Entry Point: App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { TournamentProvider } from './context/TournamentContext';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </TournamentProvider>
    </AuthProvider>
  );
}
