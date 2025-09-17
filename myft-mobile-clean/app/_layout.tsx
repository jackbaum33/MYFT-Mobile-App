// app/_layout.tsx - Step 2C: Test safe AuthProvider
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext'; // Your updated safe version

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#00274C" />
        <View style={styles.container}>
          <Text style={styles.text}>Step 2C: Safe AuthProvider</Text>
          <Text style={styles.subtext}>Testing with error handling</Text>
        </View>
      </NavigationContainer>
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