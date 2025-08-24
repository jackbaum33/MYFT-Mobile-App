// app/(tabs)/leaderboard/index.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ActionSheetIOS, Alert } from 'react-native';
import { Stack, Link } from 'expo-router';
import { useTournament } from '../../../context/TournamentContext';
import { mapPlayersById, rosterTotalPoints } from '../../utils/fantasy';
import { useAuth } from '../../../context/AuthContext';
import { makeDeterministicUsers, type FakeUser } from './_fakeUsers';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const MUTED = '#A5B4C3';
const GOLD = '#d69738', SILVER = '#C0C0C0', BRONZE = '#CD7F32';

type FilterKey = 'division' | 'school' | 'position';

export default function LeaderboardIndex() {
  const { teams, calculatePoints } = useTournament();
  const { user: signedIn } = useAuth?.() ?? { user: null };
  const [mode, setMode] = useState<'players' | 'users'>('players');

  // --- FILTER STATE ---
  const [divisionSelected, setDivisionSelected] = useState<string | null>(null); // 'boys' | 'girls' | null
  const [schoolSelected, setSchoolSelected] = useState<string | null>(null);
  const [positionSelected, setPositionSelected] = useState<string | null>(null);

  const allPlayers = useMemo(() => teams.flatMap(t => t.players), [teams]);

  // Map player.id -> team name (school)
  const playerIdToTeamName = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teams) {
      for (const p of t.players) m.set(p.id, t.name);
    }
    return m;
  }, [teams]);

  // Map player.id -> division ('boys' | 'girls') derived safely from Team
  const playerIdToDivision = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teams) {
      const anyT = t as any;
      const raw = (anyT['division'] ?? anyT['gender'] ?? anyT['category'] ?? anyT['type'] ?? '')
        .toString()
        .toLowerCase()
        .trim();

      let div = raw;
      if (raw.startsWith('men')) div = 'boys';
      else if (raw.startsWith('women') || raw.startsWith('girl')) div = 'girls';
      if (div !== 'boys' && div !== 'girls') div = '';

      for (const p of t.players) m.set(p.id, div);
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

  // Base sorted players by fantasy points
  const playersRanked = useMemo(() => {
    return [...allPlayers]
      .map(p => ({ ...p, fantasy: calculatePoints(p) }))
      .sort((a, b) => b.fantasy - a.fantasy);
  }, [allPlayers, calculatePoints]);

  // Filtered (still sorted) list
  const filteredPlayers = useMemo(() => {
    let arr = playersRanked;

    if (divisionSelected) {
      arr = arr.filter(p => (playerIdToDivision.get(p.id) ?? '') === divisionSelected);
    }
    if (schoolSelected) {
      arr = arr.filter(p => (playerIdToTeamName.get(p.id) ?? '') === schoolSelected);
    }
    if (positionSelected) {
      arr = arr.filter(p => p.position === positionSelected);
    }
    return arr;
  }, [playersRanked, divisionSelected, schoolSelected, positionSelected, playerIdToDivision, playerIdToTeamName]);

  // Dropdown option lists
  const schoolOptions = useMemo(
    () => Array.from(new Set(teams.map(t => t.name))).sort(),
    [teams]
  );
  const positionOptions = useMemo(
    () => Array.from(new Set(allPlayers.map(p => p.position))).sort(),
    [allPlayers]
  );
  const divisionOptions = ['boys', 'girls'];

  // Helpers to present native picker
  const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const presentPicker = (key: FilterKey) => {
    if (Platform.OS === 'ios') {
      let options: string[] = [];
      if (key === 'division') options = divisionOptions.map(titleCase);
      if (key === 'school') options = [...schoolOptions];
      if (key === 'position') options = [...positionOptions];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          title:
            key === 'division' ? 'Select Division' :
            key === 'school'   ? 'Select School'   :
                                 'Select Position',
          options: [...options, 'Cancel'],
          cancelButtonIndex: options.length,
          userInterfaceStyle: 'light', // force the classic white sheet
        },
        (buttonIndex) => {
          if (buttonIndex === options.length) return; // Cancel
          const value = options[buttonIndex];
          if (key === 'division') setDivisionSelected(value.toLowerCase());
          if (key === 'school') setSchoolSelected(value);
          if (key === 'position') setPositionSelected(value);
        }
      );
    } else {
      // Simple Android fallback using Alert
      if (key === 'division') {
        Alert.alert(
          'Select Division',
          '',
          [
            ...divisionOptions.map(opt => ({
              text: titleCase(opt),
              onPress: () => setDivisionSelected(opt),
            })),
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else if (key === 'school') {
        Alert.alert(
          'Select School',
          '',
          [
            ...schoolOptions.slice(0, 8).map(opt => ({ text: opt, onPress: () => setSchoolSelected(opt) })), // keep list short in Alert
            { text: 'More…', onPress: () => {} },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert(
          'Select Position',
          '',
          [
            ...positionOptions.map(opt => ({ text: opt, onPress: () => setPositionSelected(opt) })),
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    }
  };

  // Filter button behavior: tap to open; if already selected, tap clears
  const onPressFilterButton = (key: FilterKey) => {
    if (key === 'division' && divisionSelected) { setDivisionSelected(null); return; }
    if (key === 'school'   && schoolSelected)   { setSchoolSelected(null);   return; }
    if (key === 'position' && positionSelected) { setPositionSelected(null); return; }
    presentPicker(key);
  };

  /** Renders **/
  const renderPlayer = ({ item, index }: any) => {
    const school = playerIdToTeamName.get(item.id) ?? '';

    let rankStyle = styles.rank;
    if (index === 0) rankStyle = [styles.rank, { color: TEXT }] as any;
    else if (index === 1) rankStyle = [styles.rank, { color: TEXT }] as any;
    else if (index === 2) rankStyle = [styles.rank, { color: TEXT }] as any;

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
    if (index === 0) rankStyle = [styles.rank, { color: TEXT }] as any;
    else if (index === 1) rankStyle = [styles.rank, { color: TEXT }] as any;
    else if (index === 2) rankStyle = [styles.rank, { color: TEXT }] as any;

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

      {/* Players/Users toggle */}
      <View style={styles.segWrap}>
  <TouchableOpacity
    onPress={() => setMode('players' /* or 'boys' if this is the division toggle */)}
    style={[styles.segBtn, mode === 'players' && styles.segBtnActive]}
    activeOpacity={0.9}
  >
    <Text style={[styles.segText, mode === 'players' && styles.segTextActive]}>Players</Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() => setMode('users' /* or 'girls' if this is the division toggle */)}
    style={[styles.segBtn, mode === 'users' && styles.segBtnActive]}
    activeOpacity={0.9}
  >
    <Text style={[styles.segText, mode === 'users' && styles.segTextActive]}>Users</Text>
  </TouchableOpacity>
</View>


      {/* Filters (only for Players) */}
      {mode === 'players' && (
        <>
          <Text style={styles.filterLabel}>Filters</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterBtn, divisionSelected && styles.filterBtnActive]}
              onPress={() => onPressFilterButton('division')}
            >
              <Text style={[styles.filterBtnText, divisionSelected && styles.filterBtnTextActive]}>
                Division{divisionSelected ? `: ${titleCase(divisionSelected)}` : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterBtn, schoolSelected && styles.filterBtnActive]}
              onPress={() => onPressFilterButton('school')}
            >
              <Text style={[styles.filterBtnText, schoolSelected && styles.filterBtnTextActive]}>
                School{schoolSelected ? `: ${schoolSelected}` : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterBtn, positionSelected && styles.filterBtnActive]}
              onPress={() => onPressFilterButton('position')}
            >
              <Text style={[styles.filterBtnText, positionSelected && styles.filterBtnTextActive]}>
                Position{positionSelected ? `: ${positionSelected}` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </>
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
          keyExtractor={(u) => u.id}
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
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: CARD,
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: YELLOW },
  toggleText: { color: NAVY, fontWeight: '800' },

  // Filters
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  filterLabel: { color: YELLOW, fontWeight: '700', fontSize: 18, textAlign: 'center', marginRight: 4, marginBottom: 10},
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: CARD,
  },
  filterBtnActive: { backgroundColor: YELLOW },
  filterBtnText: { color: TEXT, fontWeight: '800' },
  filterBtnTextActive: { color: NAVY },

  segWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#07335f',     // the dark blue track
    borderRadius: 18,
    padding: 6,                     // gutters around the pills
    gap: 8,
    marginBottom: 20
  },
  
  // Each pill
  segBtn: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  
  // Selected pill
  segBtnActive: {
    backgroundColor: YELLOW,
    // subtle shadow for iOS
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    // elevation for Android
    elevation: 2,
  },
  
  // Text colors
  segText: {
    color: YELLOW,       // unselected label is yellow on blue track
    fontWeight: '700',
  },
  segTextActive: {
    color: NAVY,         // selected label turns navy on yellow pill
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowMe: { borderWidth: 2, borderColor: YELLOW },
  rank: { width: 48, textAlign: 'left', color: TEXT, fontWeight: '900', fontSize: 16 },
  rankTop: { color: TEXT },
  primary: { color: TEXT, fontWeight: '800', fontSize: 16 },
  sub: { color: MUTED, fontSize: 12, marginTop: 2 },
  points: { color: YELLOW, fontWeight: '900', fontSize: 18, marginLeft: 10 },
});
