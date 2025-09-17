// app/_layout.tsx - Step 2B: Test with error handling
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

// Temporary safe AuthProvider for testing
const SafeAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('SafeAuthProvider rendering...');
  
  // Simple provider that just passes through children
  return <>{children}</>;
};

export default function RootLayout() {
  console.log('RootLayout rendering...');
  
  return (
    <SafeAuthProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#00274C" />
        <View style={styles.container}>
          <Text style={styles.text}>Step 2B: Safe AuthProvider</Text>
          <Text style={styles.subtext}>Testing without Firebase calls</Text>
        </View>
      </NavigationContainer>
    </SafeAuthProvider>
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