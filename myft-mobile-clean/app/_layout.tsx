// app/_layout.tsx - Debug version
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function DebugApp() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.text}>DEBUG: App is working!</Text>
      <Text style={styles.subtext}>If you see this, React Navigation is not the issue</Text>
    </View>
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