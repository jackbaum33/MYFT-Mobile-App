// screens/TeamRosterScreen.tsx - a single member's roster after a draft completes
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useTournament } from '../../context/TournamentContext';
import { listUsers, type UserProfile } from '../../services/users';
import { subscribeToLeague, getRoster, type LeagueWithId, type LeagueRoster } from '../../services/leagues';
import { mapPlayersById, getPlayerImageUrl } from '../../utils/fantasy';
import { FONT_FAMILIES } from '../../fonts';
import type { FantasyStackParamList } from '../(tabs)/fantasy/_layout';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.12)';

type NavProp = NavigationProp<FantasyStackParamList, 'TeamRoster'>;
type RouteProp_ = RouteProp<FantasyStackParamList, 'TeamRoster'>;

type Slot = { division: 'boys' | 'girls'; playerId: string | null };

export default function TeamRosterScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp_>();
  const { id: leagueId, uid } = route.params;
  const { teams, calculatePoints } = useTournament();

  const [league, setLeague] = useState<LeagueWithId | null>(null);
  const [roster, setRoster] = useState<LeagueRoster | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => subscribeToLeague(leagueId, setLeague), [leagueId]);

  useEffect(() => {
    let active = true;
    getRoster(leagueId, uid)
      .then((r) => active && setRoster(r))
      .catch((e) => console.warn('[TeamRoster] getRoster failed:', e))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [leagueId, uid]);

  useEffect(() => {
    listUsers().then(setUsers).catch((e) => console.warn('[TeamRoster] listUsers failed:', e));
  }, []);

  const ownerName = useMemo(() => users.find((u) => u.uid === uid)?.displayName ?? uid, [users, uid]);
  const playersById = useMemo(() => mapPlayersById(teams.flatMap((t) => t.players)), [teams]);

  useEffect(() => {
    navigation.setOptions({ title: ownerName });
  }, [navigation, ownerName]);

  const slots = useMemo((): Slot[] => {
    if (!league) return [];
    const boys = roster?.boys ?? [];
    const girls = roster?.girls ?? [];
    const out: Slot[] = [];
    for (let i = 0; i < league.boysPerTeam; i++) out.push({ division: 'boys', playerId: boys[i] ?? null });
    for (let i = 0; i < league.girlsPerTeam; i++) out.push({ division: 'girls', playerId: girls[i] ?? null });
    return out;
  }, [league, roster]);

  if (loading || !league) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={YELLOW} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
      data={slots}
      keyExtractor={(s, i) => `${s.division}-${i}`}
      renderItem={({ item }) => {
        const player = item.playerId ? playersById.get(item.playerId) : undefined;
        if (!player) {
          return (
            <View style={[styles.row, styles.rowEmpty]}>
              <View style={styles.avatarFallback}>
                <Ionicons name="person-outline" size={16} color={TEXT} />
              </View>
              <Text style={styles.emptyText}>Empty {item.division === 'boys' ? 'Boys' : 'Girls'} Slot</Text>
            </View>
          );
        }
        const hasError = imageErrors.has(player.id);
        return (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Player', { id: player.id })}
          >
            {hasError ? (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={16} color={TEXT} />
              </View>
            ) : (
              <Image
                source={{ uri: getPlayerImageUrl(player.id) }}
                style={styles.avatar}
                onError={() => setImageErrors((prev) => new Set(prev).add(player.id))}
              />
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
              <Text style={styles.playerSub} numberOfLines={1}>
                {item.division === 'boys' ? 'Boys' : 'Girls'}
              </Text>
            </View>
            <Text style={styles.playerPoints}>{calculatePoints(player)} pts</Text>
            <Ionicons name="chevron-forward" size={18} color={TEXT} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  center: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: LINE,
  },
  rowEmpty: { opacity: 0.5 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#062a4e', alignItems: 'center', justifyContent: 'center' },
  playerName: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  playerSub: { color: TEXT, opacity: 0.7, fontSize: 12, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow },
  playerPoints: { color: YELLOW, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },
  emptyText: { color: TEXT, opacity: 0.7, marginLeft: 10, fontFamily: FONT_FAMILIES.archivoNarrow },
});
