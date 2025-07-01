// screens/LeaderboardScreen.tsx
import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useTournament } from '../../context/TournamentContext';

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
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>My Fantasy Leaderboard</Text>
      {roster.length === 0 ? (
        <Text style={{ fontSize: 16 }}>No players selected yet.</Text>
      ) : (
        <FlatList
          data={roster}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View
              style={{
                padding: 12,
                marginBottom: 8,
                backgroundColor: '#f9f9f9',
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 16 }}>
                {index + 1}. {item.name} ({item.division})
              </Text>
              <Text style={{ fontSize: 14, color: '#444' }}>
                TDs: {item.stats.touchdowns}, INTs: {item.stats.interceptions}, Flags: {item.stats.flagsPulled}, MVPs: {item.stats.mvpAwards}
              </Text>
              <Text style={{ fontWeight: 'bold' }}>Points: {item.fantasyPoints}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
