import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');

  const isDisabled = !username.trim() || !displayName.trim();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter username"
        placeholderTextColor="#CCCCCC"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter display name"
        placeholderTextColor="#CCCCCC"
        value={displayName}
        onChangeText={setDisplayName}
      />

      <TouchableOpacity
        style={[styles.button, isDisabled && styles.disabledButton]}
        onPress={() => login(username.trim(), displayName.trim())}
        disabled={isDisabled}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#001F3F', // navy
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#FFD700', // yellow
  },
  input: {
    backgroundColor: '#003366',
    color: '#FFD700',
    borderWidth: 1,
    borderColor: '#FFD700',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#FFD700',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#999999',
  },
  buttonText: {
    color: '#001F3F',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
