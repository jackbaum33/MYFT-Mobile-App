// app/(tabs)/leaderboard/index.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ActionSheetIOS, Alert } from 'react-native';
import { Stack, Link, router } from 'expo-router';
import { useTournament } from '../../../context/TournamentContext';
import { mapPlayersById, rosterTotalPoints } from '../../utils/fantasy';
import { useAuth } from '../../../context/AuthContext';
import { listUsers, type UserProfile } from '@/services/users';
import { FONT_FAMILIES } from '@/assets/fonts';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';

type FilterKey = 'division' | 'school' | 'position';
type RankedUser = UserProfile & { totalPoints: number };

export default function LeaderboardIndex() {
  const { teams, calculatePoints } = useTournament();
  const { user: signedIn } = useAuth();
  const [mode, setMode] = useState<'players' | 'users'>('players');

  const [divisionSelected, setDivisionSelected] = useState<string | null>(null);
  const [schoolSelected, setSchoolSelected] = useState<string | null>(null);
  const [positionSelected, setPositionSelected] = useState<string | null>(null);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);

  const allPlayers = useMemo(() => teams.flatMap(t => t.players), [teams]);

  const playerIdToTeamName = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teams) for (const p of t.players) m.set(p.id, t.name);
    return m;
  }, [teams]);

  const playerIdToDivision = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teams) {
      const anyT = t as any;
      const raw = (anyT['division'] ?? anyT['gender'] ?? anyT['category'] ?? anyT['type'] ?? '')
        .toString().toLowerCase().trim();
      let div = raw;
      if (raw.startsWith('men')) div = 'boys';
      else if (raw.startsWith('women') || raw.startsWith('girl')) div = 'girls';
      if (div !== 'boys' && div !== 'girls') div = '';
      for (const p of t.players) m.set(p.id, div);
    }
    return m;
  }, [teams]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setUsersLoading(true);
        const list = await listUsers();
        if (active) setUsers(list);
      } catch (e) {
        console.warn('[leaderboard] listUsers failed:', e);
      } finally {
        if (active) setUsersLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const playersById = useMemo(() => mapPlayersById(allPlayers), [allPlayers]);

  const usersRanked: RankedUser[] = useMemo(() => {
    const calc = (u: UserProfile): number => {
      const roster = [...(u.boys_roster ?? []), ...(u.girls_roster ?? [])];
      return rosterTotalPoints(roster, playersById, calculatePoints);
    };
    return [...users]
      .map(u => ({ ...u, totalPoints: calc(u) }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }, [users, playersById, calculatePoints]);

  const playersRanked = useMemo(
    () => [...allPlayers].map(p => ({ ...p, fantasy: calculatePoints(p) }))
                         .sort((a, b) => b.fantasy - a.fantasy),
    [allPlayers, calculatePoints]
  );

  const filteredPlayers = useMemo(() => {
    let arr = playersRanked;
    if (divisionSelected) arr = arr.filter(p => (playerIdToDivision.get(p.id) ?? '') === divisionSelected);
    if (schoolSelected) arr = arr.filter(p => (playerIdToTeamName.get(p.id) ?? '') === schoolSelected);
    return arr;
  }, [playersRanked, divisionSelected, schoolSelected, positionSelected, playerIdToDivision, playerIdToTeamName]);

  const schoolOptions = useMemo(() => Array.from(new Set(teams.map(t => t.name))).sort(), [teams]);
  const divisionOptions = ['boys', 'girls'];
  const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const presentPicker = (key: FilterKey) => {
    if (Platform.OS === 'ios') {
      let options: string[] = [];
      if (key === 'division') options = divisionOptions.map(titleCase);
      if (key === 'school')   options = [...schoolOptions];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: key === 'division' ? 'Select Division' : key === 'school' ? 'Select School' : 'Select Position',
          options: [...options, 'Cancel'],
          cancelButtonIndex: options.length,
          userInterfaceStyle: 'light',
        },
        (i) => {
          if (i === options.length) return;
          const value = options[i];
          if (key === 'division') setDivisionSelected(value.toLowerCase());
          if (key === 'school') setSchoolSelected(value);
          if (key === 'position') setPositionSelected(value);
        }
      );
    } else {
      if (key === 'division') {
        Alert.alert('Select Division','',[
          ...divisionOptions.map(opt => ({ text: titleCase(opt), onPress: () => setDivisionSelected(opt) })),
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else if (key === 'school') {
        Alert.alert('Select School','',[
          ...schoolOptions.slice(0, 8).map(opt => ({ text: opt, onPress: () => setSchoolSelected(opt) })),
          { text: 'More…', onPress: () => {} },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    }
  };

  const onPressFilterButton = (key: FilterKey) => {
    if (key === 'division' && divisionSelected) { setDivisionSelected(null); return; }
    if (key === 'school'   && schoolSelected)   { setSchoolSelected(null);   return; }
    presentPicker(key);
  };

  /** Renders **/
  const renderPlayer = ({ item, index }: any) => {
    const school = playerIdToTeamName.get(item.id) ?? '';
    let rankStyle = styles.rank;
    if (index <= 2) rankStyle = [styles.rank, { color: TEXT }] as any;

    return (
      <Link href={{ pathname: '/(tabs)/leaderboard/player/[id]', params: { id: item.id } }} asChild>
        <TouchableOpacity style={styles.row} activeOpacity={0.9}>
          <Text style={rankStyle}>{index + 1}.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.primary} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.sub} numberOfLines={1}>{school || ''}</Text>
          </View>
          <Text style={styles.points}>{item.fantasy} pts</Text>
        </TouchableOpacity>
      </Link>
    );
  };

  const renderUser = ({ item, index }: { item: RankedUser; index: number }) => {
    let rankStyle = styles.rank;
    if (index <= 2) rankStyle = [styles.rank, { color: TEXT }] as any;
    const isMe = signedIn?.uid && item.uid === signedIn.uid;

    const onPress = () =>
      router.push({ pathname: '/(tabs)/leaderboard/user/[id]', params: { id: item.uid } });

    return (
      <TouchableOpacity style={[styles.row, isMe && styles.rowMe]} activeOpacity={0.9} onPress={onPress}>
        <Text style={rankStyle}>{index + 1}.</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.primary, isMe && { color: YELLOW }]} numberOfLines={1}>
            {item.displayName}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>@{item.username}</Text>
        </View>
        <Text style={styles.points}>{item.totalPoints} pts</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Fantasy Leaderboard' }} />

      <View style={styles.segWrap}>
        <TouchableOpacity
          onPress={() => setMode('players')}
          style={[styles.segBtn, mode === 'players' && styles.segBtnActive]}
          activeOpacity={0.9}
        >
          <Text style={[styles.segText, mode === 'players' && styles.segTextActive]}>Players</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode('users')}
          style={[styles.segBtn, mode === 'users' && styles.segBtnActive]}
          activeOpacity={0.9}
        >
          <Text style={[styles.segText, mode === 'users' && styles.segTextActive]}>
            Users{usersLoading ? ' …' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ✅ Restored filter pills for Players view */}
      {mode === 'players' && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => onPressFilterButton('division')}
            style={[styles.filterBtn, !!divisionSelected && styles.filterBtnActive]}
            activeOpacity={0.9}
          >
            <Text style={[styles.filterBtnText, !!divisionSelected && styles.filterBtnTextActive]}>
              {`Division${divisionSelected ? `: ${titleCase(divisionSelected)}` : ''}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onPressFilterButton('school')}
            style={[styles.filterBtn, !!schoolSelected && styles.filterBtnActive]}
            activeOpacity={0.9}
          >
            <Text style={[styles.filterBtnText, !!schoolSelected && styles.filterBtnTextActive]}>
              {`School${schoolSelected ? `: ${schoolSelected}` : ''}`}
            </Text>
          </TouchableOpacity>

          {(divisionSelected || schoolSelected) && (
            <TouchableOpacity
              onPress={() => { setDivisionSelected(null); setSchoolSelected(null); }}
              style={styles.filterBtn}
              activeOpacity={0.9}
            >
              <Text style={styles.filterBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {mode === 'players' ? (
        <FlatList
          data={filteredPlayers}
          keyExtractor={(p) => p.id}
          renderItem={renderPlayer}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={usersRanked}
          keyExtractor={(u, i) => u.uid ?? `${u.username}-${i}`}
          renderItem={renderUser}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

/** styles **/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 12 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: CARD, alignItems: 'center' },
  toggleActive: { backgroundColor: YELLOW },
  toggleText: { color: NAVY, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack},

  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 },
  filterLabel: { color: YELLOW, fontWeight: '700', fontSize: 18, textAlign: 'center', marginRight: 4, marginBottom: 10, fontFamily: FONT_FAMILIES.archivoBlack},
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: CARD },
  filterBtnActive: { backgroundColor: YELLOW, fontFamily: FONT_FAMILIES.archivoBlack },
  filterBtnText: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack},
  filterBtnTextActive: { color: NAVY, fontFamily: FONT_FAMILIES.archivoBlack},

  segWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#07335f', borderRadius: 10, padding: 6, gap: 8, marginBottom: 20 },
  segBtn: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  segBtnActive: { backgroundColor: YELLOW, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segText: { color: YELLOW, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoBlack },
  segTextActive: { color: NAVY, fontFamily: FONT_FAMILIES.archivoBlack },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 10 },
  rowMe: { borderWidth: 2, borderColor: YELLOW },
  rank: { width: 48, textAlign: 'left', color: TEXT, fontWeight: '900', fontSize: 16 },
  rankTop: { color: TEXT },
  primary: { color: TEXT, fontWeight: '800', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },
  sub: { color: TEXT, fontSize: 12, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow},
  points: { color: YELLOW, fontWeight: '900', fontSize: 18, marginLeft: 10, fontFamily: FONT_FAMILIES.archivoBlack },
});
