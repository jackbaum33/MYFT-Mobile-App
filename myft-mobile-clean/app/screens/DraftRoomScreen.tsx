// screens/DraftRoomScreen.tsx - live draft room: on-the-clock banner, pick feed, available players
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTournament, type Division } from '../../context/TournamentContext';
import { listUsers, type UserProfile } from '../../services/users';
import {
  subscribeToLeague,
  subscribeToPicks,
  submitPick,
  pickerForNumber,
  type LeagueWithId,
  type DraftPickWithId,
} from '../../services/leagues';
import { FONT_FAMILIES } from '../../fonts';
import type { FantasyStackParamList } from '../(tabs)/fantasy/_layout';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.12)';

type RouteProp_ = RouteProp<FantasyStackParamList, 'DraftRoom'>;

function getPlayerImageUrl(playerId: string): string {
  const imageFilename = playerId.replace(/-/g, '');
  return `https://firebasestorage.googleapis.com/v0/b/myft-2025.firebasestorage.app/o/players%2F${playerId}%2F${imageFilename}.jpg?alt=media`;
}

export default function DraftRoomScreen() {
  const route = useRoute<RouteProp_>();
  const { id: leagueId } = route.params;
  const { user } = useAuth();
  const { teams, calculatePoints } = useTournament();

  const [league, setLeague] = useState<LeagueWithId | null>(null);
  const [picks, setPicks] = useState<DraftPickWithId[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => subscribeToLeague(leagueId, setLeague), [leagueId]);
  useEffect(() => subscribeToPicks(leagueId, setPicks), [leagueId]);
  useEffect(() => {
    listUsers().then(setUsers).catch((e) => console.warn('[DraftRoom] listUsers failed:', e));
  }, []);

  const usersByUid = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);
  const nameFor = (uid: string) => usersByUid.get(uid)?.displayName ?? uid;

  const allPlayers = useMemo(
    () =>
      teams.flatMap((t) =>
        t.players.map((p) => ({
          id: p.id,
          name: p.name,
          team: t.name,
          division: t.division,
          fantasy: calculatePoints(p),
        }))
      ),
    [teams, calculatePoints]
  );

  const draftedIds = useMemo(() => new Set(picks.map((p) => p.playerId)), [picks]);

  const rosterCountsByUid = useMemo(() => {
    const m = new Map<string, { boys: number; girls: number }>();
    for (const p of picks) {
      const counts = m.get(p.uid) ?? { boys: 0, girls: 0 };
      counts[p.division] += 1;
      m.set(p.uid, counts);
    }
    return m;
  }, [picks]);

  const onTheClockUid = league ? pickerForNumber(league, league.currentPickNumber ?? 0) : undefined;
  const isMyTurn = !!user?.uid && onTheClockUid === user.uid;

  const eligibleDivisions = useMemo((): Division[] => {
    if (!league || !onTheClockUid) return [];
    const counts = rosterCountsByUid.get(onTheClockUid) ?? { boys: 0, girls: 0 };
    const out: Division[] = [];
    if (counts.boys < league.boysPerTeam) out.push('boys');
    if (counts.girls < league.girlsPerTeam) out.push('girls');
    return out;
  }, [league, onTheClockUid, rosterCountsByUid]);

  const availablePlayers = useMemo(() => {
    let arr = allPlayers.filter((p) => !draftedIds.has(p.id) && eligibleDivisions.includes(p.division));
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((p) => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    return arr.sort((a, b) => b.fantasy - a.fantasy);
  }, [allPlayers, draftedIds, eligibleDivisions, search]);

  const recentPicks = useMemo(() => [...picks].reverse().slice(0, 8), [picks]);

  const onPickPlayer = async (playerId: string, division: Division) => {
    if (!user?.uid || !isMyTurn) return;
    try {
      setSubmittingId(playerId);
      await submitPick(leagueId, user.uid, playerId, division);
    } catch (e: any) {
      Alert.alert('Pick failed', e?.message ?? 'Please try again.');
    } finally {
      setSubmittingId(null);
    }
  };

  if (!league) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={YELLOW} />
      </View>
    );
  }

  if (league.status === 'complete') {
    return (
      <View style={styles.center}>
        <Ionicons name="trophy" size={64} color={YELLOW} />
        <Text style={styles.completeTitle}>Draft Complete!</Text>
        <Text style={styles.helperText}>Check the league page for final standings.</Text>
      </View>
    );
  }

  const round = Math.floor((league.currentPickNumber ?? 0) / league.memberUids.length);

  return (
    <View style={styles.container}>
      <View style={[styles.banner, isMyTurn && styles.bannerMine]}>
        <Text style={styles.bannerText}>
          {isMyTurn ? "You're on the clock!" : `On the clock: ${onTheClockUid ? nameFor(onTheClockUid) : '—'}`}
        </Text>
        <Text style={styles.bannerSub}>
          Pick {(league.currentPickNumber ?? 0) + 1} of {league.totalPicks ?? 0} • Round {round + 1}
        </Text>
      </View>

      {recentPicks.length > 0 && (
        <FlatList
          horizontal
          data={recentPicks}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          style={styles.feedList}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          renderItem={({ item }) => {
            const player = allPlayers.find((p) => p.id === item.playerId);
            return (
              <View style={styles.feedCard}>
                <Text style={styles.feedPlayer} numberOfLines={1}>{player?.name ?? item.playerId}</Text>
                <Text style={styles.feedOwner} numberOfLines={1}>{nameFor(item.uid)}</Text>
              </View>
            );
          }}
        />
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={TEXT} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search available players..."
          placeholderTextColor={`${TEXT}80`}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={availablePlayers}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.helperText}>No eligible players left.</Text>}
        renderItem={({ item }) => {
          const hasError = imageErrors.has(item.id);
          const isSubmitting = submittingId === item.id;
          return (
            <TouchableOpacity
              style={[styles.playerRow, !isMyTurn && styles.playerRowDisabled]}
              activeOpacity={0.85}
              disabled={!isMyTurn || isSubmitting}
              onPress={() => onPickPlayer(item.id, item.division)}
            >
              {hasError ? (
                <View style={styles.avatarFallback}>
                  <Ionicons name="person" size={16} color={TEXT} />
                </View>
              ) : (
                <Image
                  source={{ uri: getPlayerImageUrl(item.id) }}
                  style={styles.avatar}
                  onError={() => setImageErrors((prev) => new Set(prev).add(item.id))}
                />
              )}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.playerName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.playerSub} numberOfLines={1}>
                  {item.team} • {item.division === 'boys' ? 'Boys' : 'Girls'}
                </Text>
              </View>
              <Text style={styles.playerPoints}>{item.fantasy} pts</Text>
              {isSubmitting && <ActivityIndicator color={YELLOW} style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  center: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', padding: 24 },

  completeTitle: { color: YELLOW, fontSize: 22, fontWeight: '900', marginTop: 16, fontFamily: FONT_FAMILIES.archivoBlack },
  helperText: { color: TEXT, opacity: 0.75, textAlign: 'center', marginTop: 8, fontFamily: FONT_FAMILIES.archivoNarrow },

  banner: { backgroundColor: CARD, padding: 14, margin: 12, borderRadius: 12, borderWidth: 1, borderColor: LINE },
  bannerMine: { backgroundColor: YELLOW },
  bannerText: { color: TEXT, fontWeight: '900', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },
  bannerSub: { color: TEXT, opacity: 0.85, fontSize: 12, marginTop: 4, fontFamily: FONT_FAMILIES.archivoNarrow },

  feedList: { maxHeight: 64, marginBottom: 8 },
  feedCard: { backgroundColor: CARD, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: LINE, minWidth: 100 },
  feedPlayer: { color: TEXT, fontWeight: '800', fontSize: 12, fontFamily: FONT_FAMILIES.archivoBlack },
  feedOwner: { color: TEXT, opacity: 0.7, fontSize: 10, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: LINE,
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 15, paddingVertical: 10, fontFamily: FONT_FAMILIES.archivoNarrow },

  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: LINE,
  },
  playerRowDisabled: { opacity: 0.5 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#062a4e', alignItems: 'center', justifyContent: 'center' },
  playerName: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  playerSub: { color: TEXT, opacity: 0.7, fontSize: 12, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow },
  playerPoints: { color: YELLOW, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },
});
