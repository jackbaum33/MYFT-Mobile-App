// app/(tabs)/leaderboard/user/[id].tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, Link } from 'expo-router';
import { useTournament } from '../../../../context/TournamentContext';
import { useAuth } from '../../../../context/AuthContext';
import { makeDeterministicUsers, type FakeUser } from '../_fakeUsers';
import { mapPlayersById, rosterWithPoints, rosterTotalPoints } from '../../../utils/fantasy';
import { FONT_FAMILIES } from '@/assets/fonts';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';

export default function UserLeaderboardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teams, calculatePoints } = useTournament();
  const { user: signedIn } = useAuth?.() ?? { user: null };

  const playerIdToTeamName = useMemo(() => {
    const map = new Map<string, string>();
    teams.forEach(team => {
      team.players.forEach(p => map.set(p.id, team.name));
    });
    return map;
  }, [teams]);

  const allPlayers = useMemo(() => teams.flatMap(t => t.players), [teams]);
  const playersById = useMemo(() => mapPlayersById(allPlayers), [allPlayers]);

  // Use the SAME deterministic list so totals/rosters match index.tsx
  const users = useMemo<FakeUser[]>(
    () =>
      makeDeterministicUsers(allPlayers, calculatePoints, {
        seed: 'myft2025',
        includeCurrentUser: signedIn?.username
          ? { username: signedIn.username, displayName: signedIn.displayName }
          : null,
        count: 15,
      }),
    [allPlayers, calculatePoints, signedIn]
  );

  const user = users.find(u => u.id === id) ?? users[0]!;

  const rosterItems = useMemo(
    () => rosterWithPoints(user.roster, playersById, calculatePoints),
    [user, playersById, calculatePoints]
  );

  const grandTotal = useMemo(
    () => rosterTotalPoints(user.roster, playersById, calculatePoints),
    [user, playersById, calculatePoints]
  );

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: `${user.displayName}` }} />

      <View style={s.headerCard}>
        <Text style={s.name}>{user.displayName}</Text>
        <Text style={s.meta}>{user.username}</Text>
        <Text style={s.total}>Total Points: {grandTotal}</Text>
      </View>
      <Text style={s.teamTitle}>Team</Text>

      <FlatList
        data={rosterItems}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <Link
            href={{ pathname: '/(tabs)/leaderboard/player/[id]', params: { id: item.id } }}
            asChild
          >
            <TouchableOpacity style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.primary} numberOfLines={1}>{item.name}</Text>
                <Text style={s.sub} numberOfLines={1}>
                {playerIdToTeamName.get(item.id) ? `${playerIdToTeamName.get(item.id)}` : ''}
                </Text>
              </View>
              <Text style={s.points}>{item.fantasy} pts</Text>
            </TouchableOpacity>
          </Link>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 12 },
  headerCard: { backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 12 },
  name: { color: YELLOW, fontWeight: '900', fontSize: 20, fontFamily: FONT_FAMILIES.archivoBlack },
  meta: { color: TEXT, marginTop: 4, fontFamily: FONT_FAMILIES.archivoNarrow},
  teamTitle: { color: YELLOW, fontWeight: '900', fontSize: 20, marginBottom: 5, fontFamily: FONT_FAMILIES.archivoBlack },
  total: { color: TEXT, fontWeight: '900', fontSize: 18, marginTop: 8, fontFamily: FONT_FAMILIES.archivoNarrow},

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 14 },
  primary: { color: TEXT, fontWeight: '800', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },
  sub: { color: TEXT, fontSize: 12, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow },
  points: { color: YELLOW, fontWeight: '900', fontSize: 18, marginLeft: 10, fontFamily: FONT_FAMILIES.archivoBlack },
});
