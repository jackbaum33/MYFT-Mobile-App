// app/_layout.tsx - Minimal version to test if Firebase is causing the crash
import React from 'react';
import { Slot } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar, View, Text } from 'react-native';

export default function RootLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#00274C' }}>
      <StatusBar barStyle="light-content" backgroundColor="#001F3F" />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 18 }}>App Loading Test</Text>
      </View>
      <Slot />
    </SafeAreaView>
  );
}