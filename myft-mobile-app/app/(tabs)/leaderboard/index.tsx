// app/(tabs)/leaderboard/index.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Stack, Link } from 'expo-router';
import { useTournament } from '../../../context/TournamentContext';
import { mapPlayersById, rosterTotalPoints } from '../../utils/fantasy';
import { useAuth } from '../../../context/AuthContext';
import { makeDeterministicUsers, type FakeUser } from './_fakeUsers';

const NAVY = '#001F3F';
const CARD = '#07335f';
const YELLOW = '#FFD700';
const TEXT = '#E9ECEF';
const MUTED = '#A5B4C3';
const GOLD = '#FFD700', SILVER = '#C0C0C0', BRONZE = '#CD7F32';

export default function LeaderboardIndex() {
  const { teams, calculatePoints } = useTournament();
  const { user: signedIn } = useAuth?.() ?? { user: null };
  const [mode, setMode] = useState<'players' | 'users'>('players');

  const allPlayers = useMemo(() => teams.flatMap(t => t.players), [teams]);

  // Map player.id -> team name (school)
  const playerIdToTeamName = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teams) {
      for (const p of t.players) m.set(p.id, t.name);
    }
    return m;
  }, [teams]);

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

  const playersById = useMemo(() => mapPlayersById(allPlayers), [allPlayers]);

  const usersRanked = useMemo<FakeUser[]>(() => {
    const withTotals = users.map(u => ({
      ...u,
      totalPoints: rosterTotalPoints(u.roster, playersById, calculatePoints),
    }));
    return withTotals.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [users, playersById, calculatePoints]);

  const playersRanked = useMemo(() => {
    return [...allPlayers]
      .map(p => ({ ...p, fantasy: calculatePoints(p) }))
      .sort((a, b) => b.fantasy - a.fantasy);
  }, [allPlayers, calculatePoints]);

  /** Renders **/
  const renderPlayer = ({ item, index }: any) => {
    const school = playerIdToTeamName.get(item.id) ?? '';
  
    let rankStyle = styles.rank;
    if (index === 0) rankStyle = [styles.rank, { color: GOLD }] as any;
    else if (index === 1) rankStyle = [styles.rank, { color: SILVER }] as any;
    else if (index === 2) rankStyle = [styles.rank, { color: BRONZE }] as any;
  
    return (
      <Link
        href={{ pathname: '/(tabs)/leaderboard/player/[id]', params: { id: item.id } }}
        asChild
      >
        <TouchableOpacity style={styles.row}>
          <Text style={rankStyle}>{index + 1}.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.primary} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {item.position}{school ? ` • ${school}` : ''}
            </Text>
          </View>
          <Text style={styles.points}>{item.fantasy} pts</Text>
        </TouchableOpacity>
      </Link>
    );
  };
  

  const renderUser = ({ item, index }: { item: FakeUser; index: number }) => {
    let rankStyle = styles.rank;
    if (index === 0) rankStyle = [styles.rank, { color: GOLD }] as any;
    else if (index === 1) rankStyle = [styles.rank, { color: SILVER }] as any;
    else if (index === 2) rankStyle = [styles.rank, { color: BRONZE }] as any;

    const isMe = signedIn?.username && item.username === signedIn.username;

    return (
      <Link
        href={{ pathname: '/(tabs)/leaderboard/user/[id]', params: { id: item.id } }}
        asChild
      >
        <TouchableOpacity style={styles.row}>
          <Text style={rankStyle}>{index + 1}.</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.primary, isMe && { color: YELLOW }]} numberOfLines={1}>
              {item.displayName}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>{item.username}</Text>
          </View>
          <Text style={styles.points}>{item.totalPoints} pts</Text>
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Fantasy Leaderboard' }} />
      <View style={styles.toggleRow}>
        <TouchableOpacity
          onPress={() => setMode('players')}
          style={[styles.toggleBtn, mode === 'players' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, mode === 'players' && styles.toggleActive]}>Players</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode('users')}
          style={[styles.toggleBtn, mode === 'users' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, mode === 'users' && styles.toggleActive]}>Users</Text>
        </TouchableOpacity>
      </View>

      {mode === 'players' ? (
        <FlatList
          data={playersRanked}
          keyExtractor={(p) => p.id}
          renderItem={renderPlayer}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={usersRanked}
          keyExtractor={(u) => u.id}
          renderItem={renderUser}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

/** styles unchanged **/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 12 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#062a4e',
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: '#0b3c70' },
  toggleText: { color: MUTED, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 10 },
  rowMe: { borderWidth: 2, borderColor: YELLOW },
  rank: { width: 48, textAlign: 'left', color: TEXT, fontWeight: '900', fontSize: 16 },
  rankTop: { color: GOLD },
  primary: { color: TEXT, fontWeight: '800', fontSize: 16 },
  sub: { color: MUTED, fontSize: 12, marginTop: 2 },
  points: { color: YELLOW, fontWeight: '900', fontSize: 18, marginLeft: 10 },
});
