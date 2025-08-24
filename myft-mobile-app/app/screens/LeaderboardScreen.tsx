import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTournament } from '../../context/TournamentContext';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';

export default function LeaderboardScreen() {
  const { teams, userRoster, calculatePoints } = useTournament();

  const getRosterPlayers = () => {
    const allPlayers = teams.flatMap(team => team.players);
    const selected = [...userRoster.boys, ...userRoster.girls];
    return allPlayers
      .filter(p => selected.includes(p.id))
      .map(p => ({ ...p, fantasyPoints: calculatePoints(p) }))
      .sort((a, b) => b.fantasyPoints - a.fantasyPoints);
  };

  const roster = getRosterPlayers();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Fantasy Leaderboard</Text>
      {roster.length === 0 ? (
        <Text style={styles.emptyText}>No players selected yet.</Text>
      ) : (
        <FlatList
          data={roster}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={styles.card}>
              <Text style={styles.name}>
                {index + 1}. {item.name} ({item.division})
              </Text>
              <Text style={styles.stats}>
                TDs: {item.stats.touchdowns}, INTs: {item.stats.interceptions}, Flags: {item.stats.flagsPulled}, MVPs: {item.stats.mvpAwards}
              </Text>
              <Text style={styles.points}>Points: {item.fantasyPoints}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: NAVY, // Navy
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#FFD700', // Yellow
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#FFD700',
    textAlign: 'center',
  },
  card: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#003366',
    borderRadius: 8,
  },
  name: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  stats: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  points: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
});
