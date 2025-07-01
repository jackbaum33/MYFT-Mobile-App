// screens/ScheduleScreen.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTournament } from '../../context/TournamentContext';

export default function ScheduleScreen() {
  const { teams } = useTournament();

  // Mock schedule: each team plays the other team in their division once
  const games = teams.flatMap(team => {
    return teams
      .filter(
        opponent =>
          opponent.id !== team.id && opponent.division === team.division
      )
      .map(opponent => ({
        id: `${team.id}_vs_${opponent.id}`,
        team1: team.name,
        team2: opponent.name,
        division: team.division,
        time: 'Sat 3:00 PM',
        location: 'Field A'
      }));
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Game Schedule</Text>
      <FlatList
        data={games}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.match}>{item.team1} vs {item.team2}</Text>
            <Text style={styles.details}>{item.division} division - {item.time} @ {item.location}</Text>
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
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  match: { fontSize: 18, fontWeight: 'bold' },
  details: { fontSize: 14, color: '#555' },
});
