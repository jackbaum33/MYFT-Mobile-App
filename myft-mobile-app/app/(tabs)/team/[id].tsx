import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Stack, Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useTournament } from '../../../context/TournamentContext';
import { getTeamLogo } from '../../../assets/team_logos';

export default function TeamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { teams, calculatePoints } = useTournament();

  const team = useMemo(() => teams.find(t => t.id === id), [teams, id]);
  const players = team?.players ?? [];
  const logoSrc = getTeamLogo(team?.id);

  // ---------- Guard for bad / missing id ----------
  if (!team) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Stack.Screen
          options={{
            title: 'Team',
            headerBackVisible: true, // show default chevron
          }}
        />
        <Text style={{ color: '#FFD700', fontSize: 16, marginBottom: 12 }}>
          Team not found.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/team')}
          style={{ backgroundColor: '#FFD700', padding: 12, borderRadius: 8, alignSelf: 'flex-start' }}
        >
          <Text style={{ color: '#001F3F', fontWeight: '700' }}>Go to Rosters</Text>
        </TouchableOpacity>
      </View>
    );
  }
  // ------------------------------------------------

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `${team.name}`,
          headerBackVisible: true,    // ← let the stack pop back to the list
          // remove custom headerLeft that called replace()
          headerStyle: { backgroundColor: '#001F3F' },
          headerTintColor: '#FFD700',
          headerTitleStyle: { color: '#FFD700', fontWeight: 'bold' },
        }}
      />

      {/* Header block with text on the left and logo on the right */}
      <View style={styles.headerBlock}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{team.name}</Text>
          <Text style={styles.meta}>
            Captain: <Text style={styles.metaStrong}>{team.captain}</Text>
          </Text>
          <Text style={styles.meta}>
            Record: <Text style={styles.metaStrong}>{team.record.wins}-{team.record.losses}</Text>
          </Text>
        </View>

        {logoSrc ? <Image source={logoSrc} style={styles.logo} resizeMode="contain" /> : null}
      </View>

      <FlatList
        style={{ marginTop: 12 }}
        data={players}
        keyExtractor={(p) => p.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const pts = calculatePoints(item);
          return (
            <Link
              href={{ pathname: '/(tabs)/team/player/[id]', params: { id: item.id } }}
              asChild
            >
              <TouchableOpacity style={styles.playerRow}>
                <Text style={styles.playerName}>{item.name}</Text>
                <Text style={styles.playerMeta}>{item.position}</Text>
                <Text style={styles.playerPts}>{pts} pts</Text>
              </TouchableOpacity>
            </Link>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F', padding: 16 },

  headerBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: { flex: 1 },
  title: { color: '#FFD700', fontWeight: 'bold', fontSize: 28, marginBottom: 6 },
  meta: { color: '#D7E3F4', fontSize: 14, marginTop: 2 },
  metaStrong: { color: '#FFD700', fontWeight: '600' },

  logo: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

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
