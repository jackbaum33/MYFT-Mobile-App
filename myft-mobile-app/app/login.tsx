
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Login() {
  return (
    <View style={s.container}>
      <Text style={s.text}>Minimal Login Test</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#00274C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: { 
    color: '#FFCB05', 
    fontSize: 24, 
    fontWeight: 'bold',
  },
});