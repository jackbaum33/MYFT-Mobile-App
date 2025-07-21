// screens/FantasyScreen.tsx
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Button, StyleSheet } from 'react-native';
import { useTournament } from '../../context/TournamentContext';

export default function FantasyScreen() {
  const { teams, userRoster, updateRoster, calculatePoints } = useTournament();
  const [selectedDivision, setSelectedDivision] = useState<'boys' | 'girls'>('boys');

  const players = teams
    .filter(team => team.division === selectedDivision)
    .flatMap(team => team.players);

  const selectedIds = userRoster[selectedDivision];

  return (
    <View style={styles.container}>
      <View style={styles.buttonGroup}>
        <Button
          title="Boys"
          onPress={() => setSelectedDivision('boys')}
          color={selectedDivision === 'boys' ? '#FFD700' : '#555'}
        />
        <Button
          title="Girls"
          onPress={() => setSelectedDivision('girls')}
          color={selectedDivision === 'girls' ? '#FFD700' : '#555'}
        />
      </View>

      <Text style={styles.instructions}>
        Select up to 7 players for the {selectedDivision} division
      </Text>

      <FlatList
        data={players}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <TouchableOpacity
              style={[
                styles.playerCard,
                { backgroundColor: isSelected ? '#2ECC71' : '#003366' },
              ]}
              onPress={() => updateRoster(selectedDivision, item.id)}
            >
              <Text style={styles.playerName}>{item.name}</Text>
              <Text style={styles.playerStats}>
                TDs: {item.stats.touchdowns}, INTs: {item.stats.interceptions}, Flags: {item.stats.flagsPulled}, MVPs: {item.stats.mvpAwards}
              </Text>
              <Text style={styles.fantasyPoints}>Fantasy Pts: {calculatePoints(item)}</Text>
            </TouchableOpacity>
          );
        }}
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
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 10,
  },
  instructions: {
    fontSize: 18,
    marginBottom: 8,
    color: '#FFD700',
    textAlign: 'center',
  },
  playerCard: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  playerStats: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  fantasyPoints: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
});
