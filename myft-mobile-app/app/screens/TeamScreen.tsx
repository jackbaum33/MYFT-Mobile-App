import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTournament } from '../../context/TournamentContext';

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
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#001F3F', // navy blue
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#FFD700', // yellow
    textAlign: 'center',
  },
  card: {
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#003366', // dark navy for cards
    borderRadius: 8,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700', // yellow
  },
  playerName: {
    fontSize: 16,
    color: '#FFFFFF', // white
  },
});
