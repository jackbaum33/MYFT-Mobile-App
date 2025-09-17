// app/(tabs)/leaderboard/user/[id].tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, Link } from 'expo-router';
import { useTournament } from '../../../../TournamentContext';
import { getUser, type UserProfile } from '../../../../users';
import { FONT_FAMILIES } from '../../../../fonts';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';

type RosterRow = {
  id: string;
  name: string;
  teamName: string;
  fantasy: number;
};

// fallback for any unknown slug -> "Eli Plotkin"
function slugToTitle(id: string) {
  return id
    .split('-')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

export default function UserLeaderboardDetail() {
  const { id: uid } = useLocalSearchParams<{ id: string }>();

  // Pull teams & scoring from context (already built from Firestore + schedule aggregation)
  const { teams, calculatePoints } = useTournament();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Build quick lookup maps from context
  const { playersById, teamNameById } = useMemo(() => {
    const pMap = new Map<string, (typeof teams[number]['players'][number])>();
    const tMap = new Map<string, string>();
    for (const t of teams) {
      tMap.set(t.id, t.name);
      for (const p of t.players) pMap.set(p.id, p);
    }
    return { playersById: pMap, teamNameById: tMap };
  }, [teams]);

  // 1) fetch user profile (by uid)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!uid) return;
      try {
        setLoading(true);
        const doc = await getUser(uid);
        if (mounted) setProfile(doc);
      } catch (e) {
        console.warn('[user detail] failed to fetch user:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [uid]);

  // 2) Build roster rows entirely from context (compute points via calculatePoints)
  const rows: RosterRow[] = useMemo(() => {
    if (!profile) return [];

    const rosterIds = Array.from(
      new Set([...(profile.boys_roster ?? []), ...(profile.girls_roster ?? [])])
    );

    return rosterIds.map((pid) => {
      const p = playersById.get(pid);

      if (!p) {
        // Unknown id -> show a decent fallback; 0 points if we don't have stats in context
        return {
          id: pid,
          name: slugToTitle(pid),
          teamName: '',
          fantasy: 0,
        };
      }

      return {
        id: p.id,
        name: p.name,
        teamName: teamNameById.get(p.teamId) ?? '',
        fantasy: calculatePoints(p),
      };
    });
  }, [profile, playersById, teamNameById, calculatePoints]);

  const totalPoints = useMemo(
    () => rows.reduce((sum, it) => sum + (Number(it.fantasy) || 0), 0),
    [rows]
  );

  if (!profile || loading) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: 'User' }} />
        <View style={s.headerCard}>
          <Text style={s.name}>{loading ? 'Loading…' : 'User not found'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: `${profile.displayName}` }} />

      <View style={s.headerCard}>
        <Text style={s.name}>{profile.displayName}</Text>
        <Text style={s.meta}>@{profile.username}</Text>
        <Text style={s.total}>Total Points: {totalPoints}</Text>
      </View>

      <Text style={s.teamTitle}>Team</Text>

      <FlatList
        data={rows}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <Link
            href={{ pathname: '/(tabs)/leaderboard/player/[id]', params: { id: item.id } }}
            asChild
          >
            <TouchableOpacity style={s.row} activeOpacity={0.9}>
              <View style={{ flex: 1 }}>
                <Text style={s.primary} numberOfLines={1}>{item.name}</Text>
                <Text style={s.sub} numberOfLines={1}>{item.teamName}</Text>
              </View>
              <Text style={s.points}>{item.fantasy} pts</Text>
            </TouchableOpacity>
          </Link>
        )}
        ListEmptyComponent={
          <View style={[s.row, { justifyContent: 'center' }]}>
            <Text style={s.primary}>No players yet</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 12 },
  headerCard: { backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 12 },
  name: { color: YELLOW, fontWeight: '900', fontSize: 20, fontFamily: FONT_FAMILIES.archivoBlack },
  meta: { color: TEXT, marginTop: 4, fontFamily: FONT_FAMILIES.archivoNarrow },
  teamTitle: { color: YELLOW, fontWeight: '900', fontSize: 20, marginBottom: 5, fontFamily: FONT_FAMILIES.archivoBlack },
  total: { color: TEXT, fontWeight: '900', fontSize: 18, marginTop: 8, fontFamily: FONT_FAMILIES.archivoNarrow },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 14 },
  primary: { color: TEXT, fontWeight: '800', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },
  sub: { color: TEXT, fontSize: 12, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow },
  points: { color: YELLOW, fontWeight: '900', fontSize: 18, marginLeft: 10, fontFamily: FONT_FAMILIES.archivoBlack },
});
