import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function Page() {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the Tournament App</Text>

      <View style={styles.buttonGroup}>
        <Button title="Teams" onPress={() => router.push('/(tabs)/team')} />
        <Button title="Schedule" onPress={() => router.push('/(tabs)/schedule')} />
        <Button title="Fantasy" onPress={() => router.push('/(tabs)/fantasy')} />
        <Button title="Leaderboard" onPress={() => router.push('/(tabs)/leaderboard')} />
        <Button title="Profile" onPress={() => router.push('/(tabs)/profile')} />
        <Button title="Logout" color="red" onPress={logout} />
      </View>
    </View>
  );
}

export const options = {
  tabBarLabel: 'Home',
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonGroup: {
    gap: 12,
  },
});
