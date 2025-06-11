// screens/GlobalLeaderboardScreen.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function GlobalLeaderboardScreen() {
  const { allUsers } = useAuth();

  const sortedUsers = [...allUsers]
    .filter(u => typeof u.points === 'number')
    .sort((a, b) => (b.points || 0) - (a.points || 0));

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Global Leaderboard</Text>
      <FlatList
        data={sortedUsers}
        keyExtractor={(item) => item.username}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <Text style={styles.rank}>{index + 1}.</Text>
            <View>
              <Text style={styles.name}>{item.displayName}</Text>
              <Text style={styles.points}>Points: {item.points || 0}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 10,
  },
  rank: { fontSize: 18, fontWeight: 'bold', width: 30 },
  name: { fontSize: 16, fontWeight: '500' },
  points: { fontSize: 14, color: '#555' },
});
