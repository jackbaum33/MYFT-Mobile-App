import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, ActionSheetIOS, Alert, TextInput, Image,
  Modal, Pressable, ScrollView,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTournament } from '../../../context/TournamentContext';
import { mapPlayersById, rosterTotalPoints } from '../../../utils/fantasy';
import { useAuth } from '../../../context/AuthContext';
import { listUsers, type UserProfile } from '../../../services/users';
import { FONT_FAMILIES } from '../../../fonts';
import { LeaderboardStackParamList } from './_layout';

type LeaderboardNavigationProp = NavigationProp<LeaderboardStackParamList, 'LeaderboardIndex'>;

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.12)';

type FilterKey = 'division' | 'school';
type RankedUser = UserProfile & { totalPoints: number };

const STAT_OPTIONS: { key: string; label: string; short: string }[] = [
  { key: 'fantasy',              label: 'Fantasy Points',       short: 'pts'      },
  { key: 'touchdowns',           label: 'Touchdowns',           short: 'TDs'      },
  { key: 'passingTDs',           label: 'Passing TDs',          short: 'pass TDs' },
  { key: 'catches',              label: 'Catches',              short: 'rec'      },
  { key: 'shortReceptions',      label: 'Short Receptions',     short: 'sh rec'   },
  { key: 'mediumReceptions',     label: 'Medium Receptions',    short: 'med rec'  },
  { key: 'longReceptions',       label: 'Long Receptions',      short: 'lng rec'  },
  { key: 'minimalReceptions',    label: 'Minimal Receptions',   short: 'min rec'  },
  { key: 'flagsPulled',          label: 'Flag Grabs',           short: 'flags'    },
  { key: 'sacks',                label: 'Sacks',                short: 'sacks'    },
  { key: 'interceptions',        label: 'Interceptions',        short: 'INTs'     },
  { key: 'passingInterceptions', label: 'Passing Interceptions', short: 'pass INTs' },
];

function getStatValue(player: any, key: string): number {
  if (key === 'fantasy') return player.fantasy ?? 0;
  return (player.stats as any)?.[key] ?? 0;
}

function getPlayerImageUrl(playerId: string): string {
  const imageFilename = playerId.replace(/-/g, '');
  return `https://firebasestorage.googleapis.com/v0/b/myft-2025.firebasestorage.app/o/players%2F${playerId}%2F${imageFilename}.jpg?alt=media`;
}

export default function LeaderboardIndex() {
  const navigation = useNavigation<LeaderboardNavigationProp>();
  const { teams, calculatePoints } = useTournament();
  const { user: signedIn } = useAuth();
  const [mode, setMode] = useState<'players' | 'users'>('players');

  const [divisionSelected, setDivisionSelected] = useState<string | null>(null);
  const [schoolSelected, setSchoolSelected] = useState<string | null>(null);
  const [statSelected, setStatSelected] = useState<string>('fantasy');
  const [showStatPicker, setShowStatPicker] = useState(false);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playerImageErrors, setPlayerImageErrors] = useState<Set<string>>(new Set());

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
    return [...users]
      .map(u => ({
        ...u,
        totalPoints: rosterTotalPoints(
          [...(u.boys_roster ?? []), ...(u.girls_roster ?? [])],
          playersById,
          calculatePoints
        ),
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }, [users, playersById, calculatePoints]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return usersRanked;
    const query = searchQuery.toLowerCase().trim();
    return usersRanked.filter(u =>
      u.displayName.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query)
    );
  }, [usersRanked, searchQuery]);

  // All players with fantasy pts attached; filters + stat sort applied together
  const filteredPlayers = useMemo(() => {
    let arr = allPlayers.map(p => ({ ...p, fantasy: calculatePoints(p) }));
    if (divisionSelected) arr = arr.filter(p => (playerIdToDivision.get(p.id) ?? '') === divisionSelected);
    if (schoolSelected)   arr = arr.filter(p => (playerIdToTeamName.get(p.id) ?? '') === schoolSelected);
    return arr.sort((a, b) => getStatValue(b, statSelected) - getStatValue(a, statSelected));
  }, [allPlayers, calculatePoints, divisionSelected, schoolSelected, statSelected, playerIdToDivision, playerIdToTeamName]);

  const schoolOptions = useMemo(() => Array.from(new Set(teams.map(t => t.name))).sort(), [teams]);
  const divisionOptions = ['boys', 'girls'];
  const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const selectedStatOption = STAT_OPTIONS.find(o => o.key === statSelected) ?? STAT_OPTIONS[0];

  const presentPicker = (key: FilterKey) => {
    if (Platform.OS === 'ios') {
      const options = key === 'division' ? divisionOptions.map(titleCase) : [...schoolOptions];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: key === 'division' ? 'Select Division' : 'Select School',
          options: [...options, 'Cancel'],
          cancelButtonIndex: options.length,
          userInterfaceStyle: 'light',
        },
        (i) => {
          if (i === options.length) return;
          if (key === 'division') setDivisionSelected(options[i].toLowerCase());
          if (key === 'school')   setSchoolSelected(options[i]);
        }
      );
    } else {
      if (key === 'division') {
        Alert.alert('Select Division', '', [
          ...divisionOptions.map(opt => ({ text: titleCase(opt), onPress: () => setDivisionSelected(opt) })),
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Select School', '', [
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

  const navigateToPlayer = (playerId: string) => navigation.navigate('Player', { id: playerId });
  const navigateToUser   = (userId: string)   => navigation.navigate('User',   { id: userId });

  const renderPlayer = ({ item, index }: any) => {
    const school = playerIdToTeamName.get(item.id) ?? '';
    const rankStyle = index <= 2 ? [styles.rank, { color: TEXT }] : styles.rank;
    const imageUrl = getPlayerImageUrl(item.id);
    const hasError = playerImageErrors.has(item.id);
    const val = getStatValue(item, statSelected);
    const unit = selectedStatOption.short;

    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.9} onPress={() => navigateToPlayer(item.id)}>
        <Text style={rankStyle as any}>{index + 1}.</Text>
        {!hasError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.playerImage}
            onError={() => setPlayerImageErrors(prev => new Set(prev).add(item.id))}
          />
        ) : (
          <View style={styles.playerImagePlaceholder}>
            <Ionicons name="person" size={18} color={TEXT} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.primary} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.sub} numberOfLines={1}>{school}</Text>
        </View>
        <Text style={styles.points}>{val} <Text style={styles.pointsUnit}>{unit}</Text></Text>
      </TouchableOpacity>
    );
  };

  const renderUser = ({ item, index }: { item: RankedUser; index: number }) => {
    const rankStyle = index <= 2 ? [styles.rank, { color: TEXT }] : styles.rank;
    const isMe = signedIn?.uid && item.uid === signedIn.uid;
    const initials = item.displayName.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);

    return (
      <TouchableOpacity style={[styles.row, isMe && styles.rowMe]} activeOpacity={0.9} onPress={() => navigateToUser(item.uid)}>
        <Text style={rankStyle as any}>{index + 1}.</Text>
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.profilePic} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.primary, isMe && { color: YELLOW }]} numberOfLines={1}>{item.displayName}</Text>
          <Text style={styles.sub} numberOfLines={1}>@{item.username}</Text>
        </View>
        <Text style={styles.points}>{item.totalPoints} <Text style={styles.pointsUnit}>pts</Text></Text>
      </TouchableOpacity>
    );
  };

  const hasActiveFilters = divisionSelected || schoolSelected || statSelected !== 'fantasy';

  return (
    <View style={styles.container}>
      {/* Mode toggle */}
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
            Fantasy Teams{usersLoading ? ' …' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter pills — Players */}
      {mode === 'players' && (
        <View style={styles.filterRow}>
          {/* Division */}
          <TouchableOpacity
            onPress={() => onPressFilterButton('division')}
            style={[styles.filterBtn, !!divisionSelected && styles.filterBtnActive]}
            activeOpacity={0.9}
          >
            <Text style={[styles.filterBtnText, !!divisionSelected && styles.filterBtnTextActive]}>
              {divisionSelected ? titleCase(divisionSelected) : 'Division'}
            </Text>
          </TouchableOpacity>

          {/* School */}
          <TouchableOpacity
            onPress={() => onPressFilterButton('school')}
            style={[styles.filterBtn, !!schoolSelected && styles.filterBtnActive]}
            activeOpacity={0.9}
          >
            <Text style={[styles.filterBtnText, !!schoolSelected && styles.filterBtnTextActive]}>
              {schoolSelected ?? 'School'}
            </Text>
          </TouchableOpacity>

          {/* Sort by stat */}
          <TouchableOpacity
            onPress={() => setShowStatPicker(true)}
            style={[styles.filterBtn, statSelected !== 'fantasy' && styles.filterBtnActive]}
            activeOpacity={0.9}
          >
            <Text style={[styles.filterBtnText, statSelected !== 'fantasy' && styles.filterBtnTextActive]}>
              {statSelected === 'fantasy' ? 'Sort by' : selectedStatOption.label}
            </Text>
          </TouchableOpacity>

          {/* Clear all */}
          {hasActiveFilters && (
            <TouchableOpacity
              onPress={() => { setDivisionSelected(null); setSchoolSelected(null); setStatSelected('fantasy'); }}
              style={styles.filterBtn}
              activeOpacity={0.9}
            >
              <Text style={styles.filterBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Search bar — Fantasy Teams */}
      {mode === 'users' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={20} color={TEXT} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              placeholderTextColor={`${TEXT}80`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={TEXT} />
              </TouchableOpacity>
            )}
          </View>
          {searchQuery.length > 0 && (
            <Text style={styles.searchResults}>
              {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}

      {mode === 'players' ? (
        <FlatList
          data={filteredPlayers}
          keyExtractor={p => p.id}
          renderItem={renderPlayer}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(u, i) => u.uid ?? `${u.username}-${i}`}
          renderItem={renderUser}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Stat picker modal */}
      <Modal
        visible={showStatPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatPicker(false)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setShowStatPicker(false)}>
          <Pressable style={styles.pickerSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Sort Players By</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {STAT_OPTIONS.map(opt => {
                const active = statSelected === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.pickerOption, active && styles.pickerOptionActive]}
                    activeOpacity={0.85}
                    onPress={() => { setStatSelected(opt.key); setShowStatPicker(false); }}
                  >
                    <Text style={[styles.pickerOptionText, active && styles.pickerOptionTextActive]}>
                      {opt.label}
                    </Text>
                    {active && <Ionicons name="checkmark" size={20} color={NAVY} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 12 },

  segWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#07335f', borderRadius: 10,
    padding: 6, gap: 8, marginBottom: 20,
  },
  segBtn: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  segBtnActive: { backgroundColor: YELLOW, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segText: { color: YELLOW, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoBlack },
  segTextActive: { color: NAVY, fontFamily: FONT_FAMILIES.archivoBlack },

  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: CARD },
  filterBtnActive: { backgroundColor: YELLOW },
  filterBtnText: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  filterBtnTextActive: { color: NAVY, fontFamily: FONT_FAMILIES.archivoBlack },

  searchContainer: { marginBottom: 16 },
  searchInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: LINE,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: TEXT, fontSize: 16, fontFamily: FONT_FAMILIES.archivoNarrow, paddingVertical: 12 },
  clearButton: { padding: 4, marginLeft: 8 },
  searchResults: { color: TEXT, fontSize: 12, marginTop: 4, marginLeft: 4, fontFamily: FONT_FAMILIES.archivoNarrow, opacity: 0.8 },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 10 },
  rowMe: { borderWidth: 2, borderColor: YELLOW },
  rank: { width: 48, textAlign: 'left', color: TEXT, fontWeight: '900', fontSize: 16, marginRight: 8, fontFamily: FONT_FAMILIES.archivoBlack },

  playerImage: { width: 32, height: 32, borderRadius: 16, marginRight: 12 },
  playerImagePlaceholder: { width: 32, height: 32, borderRadius: 16, marginRight: 12, backgroundColor: '#062a4e', alignItems: 'center', justifyContent: 'center' },

  profilePic: { width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 2, borderColor: YELLOW },
  defaultAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: YELLOW, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 2, borderColor: YELLOW },
  avatarText: { color: NAVY, fontWeight: '900', fontSize: 14, fontFamily: FONT_FAMILIES.archivoBlack },

  primary: { color: TEXT, fontWeight: '800', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },
  sub: { color: TEXT, fontSize: 12, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow },
  points: { color: YELLOW, fontWeight: '900', fontSize: 18, marginLeft: 10, fontFamily: FONT_FAMILIES.archivoBlack },
  pointsUnit: { color: TEXT, fontWeight: '700', fontSize: 12, fontFamily: FONT_FAMILIES.archivoNarrow },

  // Stat picker sheet
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: NAVY, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingBottom: 32, maxHeight: '70%',
    borderWidth: 1, borderColor: LINE,
  },
  pickerHandle: { width: 40, height: 4, backgroundColor: LINE, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  pickerTitle: { color: YELLOW, fontWeight: '900', fontSize: 18, fontFamily: FONT_FAMILIES.archivoBlack, marginBottom: 12 },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: CARD, borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8,
  },
  pickerOptionActive: { backgroundColor: YELLOW },
  pickerOptionText: { color: TEXT, fontWeight: '800', fontSize: 15, fontFamily: FONT_FAMILIES.archivoBlack },
  pickerOptionTextActive: { color: NAVY },
});
