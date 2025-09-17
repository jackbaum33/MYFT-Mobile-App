// app/_layout.tsx - Step 2: Add context providers
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { TournamentProvider } from '../context/TournamentContext';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#00274C" />
          <View style={styles.container}>
            <Text style={styles.text}>Step 2: Context providers added</Text>
            <Text style={styles.subtext}>AuthProvider & TournamentProvider working</Text>
          </View>
        </NavigationContainer>
      </TournamentProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00274C',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    color: '#FFCB05',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtext: {
    color: '#E9ECEF',
    fontSize: 16,
    textAlign: 'center',
  },
});