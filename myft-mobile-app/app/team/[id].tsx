// app/team/[id].tsx
import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTournament } from '../../context/TournamentContext';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { teams, calculatePoints } = useTournament();

  const team = useMemo(() => teams.find(t => t.id === id), [teams, id]);
  const players = team?.players ?? [];

  return (
    <View style={styles.container}>
      {/* 🔹 Set the header title and custom back in the Stack.Screen for this route */}
      <Stack.Screen
        options={{
          title: team ? `Team View - ${team.name}` : 'Team View',
          // We’ll provide our own back button that always goes to Rosters
          headerBackVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.replace('/(tabs)/team')}>
              <Text style={{ color: '#FFD700', fontWeight: '600' }}>Back</Text>
            </TouchableOpacity>
          ),
          // (These match your theme; keep or remove if already set in app/team/_layout.tsx)
          headerStyle: { backgroundColor: '#001F3F' },
          headerTintColor: '#FFD700',
          headerTitleStyle: { color: '#FFD700', fontWeight: 'bold' },
        }}
      />

      <Text style={styles.title}>{team?.name}</Text>
      <Text style={styles.meta}>
        Captain: <Text style={styles.metaStrong}>{team?.captain}</Text>
      </Text>
      <Text style={styles.meta}>
        Record: <Text style={styles.metaStrong}>{team?.record.wins}-{team?.record.losses}</Text>
      </Text>

      <FlatList
        style={{ marginTop: 12 }}
        data={players}
        keyExtractor={(p) => p.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const pts = calculatePoints(item);
          return (
            <View style={styles.playerRow}>
              <Text style={styles.playerName}>{item.name}</Text>
              <Text style={styles.playerMeta}>{item.position}</Text>
              <Text style={styles.playerPts}>{pts} pts</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F', padding: 16 },
  title: { color: '#FFD700', fontWeight: 'bold', fontSize: 28, marginBottom: 6 },
  meta: { color: '#D7E3F4', fontSize: 14, marginTop: 2 },
  metaStrong: { color: '#FFD700', fontWeight: '600' },

  playerRow: {
    backgroundColor: '#07335f',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerName: { flex: 1, color: '#FFD700', fontSize: 16, fontWeight: '600' },
  playerMeta: { width: 60, textAlign: 'right', color: '#D7E3F4' },
  playerPts: { width: 70, textAlign: 'right', color: '#FFD700', fontWeight: '700' },
});
