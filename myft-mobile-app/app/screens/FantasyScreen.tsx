// screens/FantasyScreen.tsx
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Button } from 'react-native';
import { useTournament } from '../../context/TournamentContext';

export default function FantasyScreen() {
  const { teams, userRoster, updateRoster, calculatePoints } = useTournament();
  const [selectedDivision, setSelectedDivision] = useState<'boys' | 'girls'>('boys');

  const players = teams
    .filter(team => team.division === selectedDivision)
    .flatMap(team => team.players);

  const selectedIds = userRoster[selectedDivision];

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }}>
        <Button
          title="Boys"
          onPress={() => setSelectedDivision('boys')}
          color={selectedDivision === 'boys' ? '#1E90FF' : '#999'}
        />
        <Button
          title="Girls"
          onPress={() => setSelectedDivision('girls')}
          color={selectedDivision === 'girls' ? '#FF69B4' : '#999'}
        />
      </View>

      <Text style={{ fontSize: 18, marginBottom: 8 }}>
        Select up to 7 players for the {selectedDivision} division
      </Text>

      <FlatList
        data={players}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <TouchableOpacity
              style={{
                padding: 12,
                marginBottom: 8,
                borderRadius: 8,
                backgroundColor: isSelected ? '#90EE90' : '#f0f0f0',
              }}
              onPress={() => updateRoster(selectedDivision, item.id)}
            >
              <Text style={{ fontSize: 16 }}>{item.name}</Text>
              <Text style={{ fontSize: 14, color: '#555' }}>
                TDs: {item.stats.touchdowns}, INTs: {item.stats.interceptions}, Flags: {item.stats.flagsPulled}, MVPs: {item.stats.mvpAwards}
              </Text>
              <Text style={{ fontWeight: 'bold' }}>Fantasy Pts: {calculatePoints(item)}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
