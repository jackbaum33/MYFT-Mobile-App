import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTournament } from '../../context/TournamentContext';

export default function ScheduleScreen() {
  const { teams } = useTournament();

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
    backgroundColor: '#003366', // darker navy
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  match: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700', // yellow
  },
  details: {
    fontSize: 14,
    color: '#FFFFFF', // white for contrast
  },
});
