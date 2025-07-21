import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.outer}>  {/* <-- NEW wrapper with full background */}
      <View style={styles.container}>
        <Text style={styles.title}>🏈 Tournament App</Text>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/team')}>
          <Text style={styles.buttonText}>Teams</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/schedule')}>
          <Text style={styles.buttonText}>Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/fantasy')}>
          <Text style={styles.buttonText}>My Fantasy Team</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => router.push('/leaderboard')}>
          <Text style={styles.buttonText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#001F3F', // Ensure entire screen gets navy
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
    color: '#FFD700',
  },
  button: {
    backgroundColor: '#003366',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFD700',
    fontSize: 18,
    textAlign: 'center',
  },
});
