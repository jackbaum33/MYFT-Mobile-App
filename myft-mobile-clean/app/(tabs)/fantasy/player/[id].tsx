// fantasy/player/[id].tsx - Player Detail Screen: fantasy points + full stat/scoring breakdown
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { FantasyStackParamList } from '../_layout';
import { useTournament, SCORING, type Player, type PlayerStats } from '../../../../context/TournamentContext';
import { getPlayerImageUrl } from '../../../../utils/fantasy';
import { FONT_FAMILIES } from '../../../../fonts';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.12)';

type PlayerScreenRouteProp = RouteProp<FantasyStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NavigationProp<FantasyStackParamList, 'Player'>;

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const STAT_ROWS: { key: keyof PlayerStats; label: string; points: number }[] = [
  { key: 'touchdowns', label: 'Touchdowns', points: SCORING.touchdown },
  { key: 'passingTDs', label: 'Passing TDs', points: SCORING.passingTD },
  { key: 'catches', label: 'Catches', points: SCORING.catch },
  { key: 'minimalReceptions', label: 'Minimal Receptions', points: SCORING.minimalReception },
  { key: 'shortReceptions', label: 'Short Receptions', points: SCORING.shortReception },
  { key: 'mediumReceptions', label: 'Medium Receptions', points: SCORING.mediumReception },
  { key: 'longReceptions', label: 'Long Receptions', points: SCORING.longReception },
  { key: 'flagsPulled', label: 'Flags Pulled', points: SCORING.flagGrab },
  { key: 'sacks', label: 'Sacks', points: SCORING.sack },
  { key: 'interceptions', label: 'Interceptions', points: SCORING.interception },
  { key: 'passingInterceptions', label: 'Passing Interceptions', points: SCORING.passingInterception },
];

export default function PlayerScreen() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const { id } = route.params;
  const { teams, calculatePoints } = useTournament();
  const [imageError, setImageError] = useState(false);

  const found = useMemo(() => {
    for (const t of teams) {
      const p = t.players.find((pl) => pl.id === id);
      if (p) return { player: p, team: t };
    }
    return null;
  }, [teams, id]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: found?.player.name ?? 'Player' });
  }, [navigation, found]);

  if (!found) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Player not found.</Text>
      </View>
    );
  }

  const { player, team } = found;
  const points = calculatePoints(player as Player);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.header}>
        {imageError ? (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" size={36} color={TEXT} />
          </View>
        ) : (
          <Image
            source={{ uri: getPlayerImageUrl(player.id) }}
            style={styles.avatar}
            onError={() => setImageError(true)}
          />
        )}
        <Text style={styles.name}>{player.name}</Text>
        <Text style={styles.meta}>{team.name} • {capitalize(player.division)}</Text>
        <View style={styles.pointsPill}>
          <Text style={styles.pointsPillText}>{points} Fantasy Points</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Stat Breakdown</Text>
      <View style={styles.card}>
        {STAT_ROWS.map((row, i) => {
          const value = player.stats[row.key];
          const earned = value * row.points;
          return (
            <View key={row.key} style={[styles.statRow, i === STAT_ROWS.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.statLabel}>{row.label}</Text>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statMultiplier}>× {row.points}</Text>
              <Text style={styles.statEarned}>{earned}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  center: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  notFound: { color: TEXT, fontFamily: FONT_FAMILIES.archivoNarrow },

  header: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#062a4e', alignItems: 'center', justifyContent: 'center' },
  name: { color: YELLOW, fontSize: 22, fontWeight: '900', marginTop: 12, fontFamily: FONT_FAMILIES.archivoBlack },
  meta: { color: TEXT, opacity: 0.85, marginTop: 4, fontFamily: FONT_FAMILIES.archivoNarrow },
  pointsPill: { backgroundColor: YELLOW, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 12 },
  pointsPillText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  sectionLabel: { color: YELLOW, fontWeight: '700', fontSize: 14, marginBottom: 8, fontFamily: FONT_FAMILIES.archivoBlack },
  card: { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: LINE, paddingHorizontal: 14 },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  statLabel: { flex: 1, color: TEXT, fontFamily: FONT_FAMILIES.archivoNarrow },
  statValue: { color: TEXT, fontWeight: '800', width: 28, textAlign: 'right', fontFamily: FONT_FAMILIES.archivoBlack },
  statMultiplier: { color: TEXT, opacity: 0.6, width: 48, textAlign: 'right', fontSize: 12, fontFamily: FONT_FAMILIES.archivoNarrow },
  statEarned: { color: YELLOW, fontWeight: '900', width: 40, textAlign: 'right', fontFamily: FONT_FAMILIES.archivoBlack },
});
