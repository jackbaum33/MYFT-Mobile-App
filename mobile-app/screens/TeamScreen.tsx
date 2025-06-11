// screens/TeamScreen.tsx
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTournament } from '../context/TournamentContext';

export default function TeamScreen() {
  const { teams } = useTournament();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>All Teams</Text>
      <FlatList
        data={teams}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.teamName}>{item.name} ({item.division})</Text>
            {item.players.map(player => (
              <Text key={player.id} style={styles.playerName}>- {player.name}</Text>
            ))}
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
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  teamName: { fontSize: 18, fontWeight: 'bold' },
  playerName: { fontSize: 16, color: '#333' },
});
