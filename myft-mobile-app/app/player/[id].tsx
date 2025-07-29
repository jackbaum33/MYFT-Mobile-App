// app/player/[id].tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTournament } from '../../context/TournamentContext';
import { getTeamLogo } from '../../assets/team_logos'; // ← logo helper

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { teams, calculatePoints } = useTournament();

  // Find player, teamName, and teamId in one pass
  const { player, teamName, teamId } = useMemo(() => {
    let foundPlayer: any = null;
    let foundTeamName = '';
    let foundTeamId = '';
    for (const t of teams) {
      const p = t.players.find(pl => pl.id === id);
      if (p) {
        foundPlayer = p;
        foundTeamName = t.name;
        foundTeamId = t.id;
        break;
      }
    }
    return { player: foundPlayer, teamName: foundTeamName, teamId: foundTeamId };
  }, [teams, id]);

  const logoSrc = getTeamLogo(teamId || undefined);
  const pts = player ? calculatePoints(player) : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: player ? `Player Stats for ${player.name}` : 'Player',
          headerBackVisible: false, // we'll render our own back to ensure it goes to the team page
          headerLeft: () => (
            <TouchableOpacity
              onPress={() =>
                teamId
                  ? router.replace({ pathname: '/team/[id]', params: { id: teamId } })
                  : router.back()
              }
            >
              <Text style={{ color: '#FFD700', fontWeight: '600' }}>Back</Text>
            </TouchableOpacity>
          ),
          headerStyle: { backgroundColor: '#001F3F' },
          headerTintColor: '#FFD700',
          headerTitleStyle: { color: '#FFD700', fontWeight: 'bold' },
        }}
      />

      {player ? (
        <>
          {/* Header block: text on left, logo on right */}
          <View style={styles.headerBlock}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{player.name}</Text>
              <Text style={styles.meta}>
                Team: <Text style={styles.metaStrong}>{teamName}</Text>
              </Text>
              <Text style={styles.meta}>
                Position: <Text style={styles.metaStrong}>{player.position}</Text>
              </Text>
            </View>

            {logoSrc ? (
              <Image source={logoSrc} style={styles.logo} resizeMode="contain" />
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Points Breakdown</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Touchdowns</Text>
              <Text style={styles.value}>{player.stats.touchdowns}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Interceptions</Text>
              <Text style={styles.value}>{player.stats.interceptions}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Flags Pulled</Text>
              <Text style={styles.value}>{player.stats.flagsPulled}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>MVP Awards</Text>
              <Text style={styles.value}>{player.stats.mvpAwards}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Fantasy Points</Text>
              <Text style={styles.totalValue}>{pts} pts</Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.meta}>Player not found.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F', padding: 16 },

  // Header block with logo on right
  headerBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },

  title: { color: '#FFD700', fontWeight: 'bold', fontSize: 28, marginBottom: 6 },
  meta: { color: '#D7E3F4', fontSize: 16, marginBottom: 4 },
  metaStrong: { color: '#FFD700', fontWeight: '600' },

  logo: {
    width: 54,
    height: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  card: {
    marginTop: 8,
    backgroundColor: '#07335f',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    color: '#FFD700',
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: { color: '#D7E3F4', fontSize: 16 },
  value: { color: '#FFD700', fontWeight: '600', fontSize: 16 },

  totalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    marginTop: 10,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: { color: '#FFD700', fontWeight: '700', fontSize: 18 },
  totalValue: { color: '#FFD700', fontWeight: '800', fontSize: 18 },
});
