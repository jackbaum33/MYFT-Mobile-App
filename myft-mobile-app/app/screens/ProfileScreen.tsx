import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.containerWithBg}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.text}>Username: {user?.username}</Text>

        <TouchableOpacity style={styles.button} onPress={logout}>
          <Text style={styles.buttonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#001F3F',
  },
  containerWithBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#001F3F', // ✅ Add this
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#FFD700',
  },
  text: {
    fontSize: 18,
    marginBottom: 24,
    color: '#FFD700',
  },
  button: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#001F3F',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
