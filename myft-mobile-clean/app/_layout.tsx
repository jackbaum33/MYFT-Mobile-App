// app/_layout.tsx - Step 1: Add NavigationContainer
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <View style={styles.container}>
        <Text style={styles.text}>Step 1: NavigationContainer added</Text>
        <Text style={styles.subtext}>Navigation is working</Text>
      </View>
    </NavigationContainer>
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