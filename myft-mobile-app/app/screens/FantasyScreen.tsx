// screens/FantasyScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILIES } from '@/assets/fonts';
import { useTournament } from '../../context/TournamentContext';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.12)';

type FilterKey = 'division' | 'school' | null;

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default function FantasyScreen() {
  const { teams, userRoster, updateRoster, calculatePoints } = useTournament();

  /** -------------------------
   *   Onboarding / view state
   *  ------------------------- */
  const [hasOnboarded, setHasOnboarded] = useState(false); // swap to persistent storage later
  const [tab, setTab] = useState<'all' | 'team'>('all');

  /** -------------------------
   *   Filters
   *  ------------------------- */
  const [activeFilter, setActiveFilter] = useState<FilterKey>(null);
  const [divisionSelected, setDivisionSelected] = useState<'boys' | 'girls' | null>(null);
  const [schoolSelected, setSchoolSelected] = useState<string | null>(null);

  const allPlayers = useMemo(
    () => teams.flatMap(t => t.players.map(p => ({ ...p, __team: t.name, __division: t.division } as any))),
    [teams]
  );

  const schoolOptions = useMemo(
    () => Array.from(new Set(teams.map(t => t.name))).sort(),
    [teams]
  );

  const maxBoys = 4;
  const maxGirls = 4;
  const selectedBoys = userRoster.boys?.length ?? 0;
  const selectedGirls = userRoster.girls?.length ?? 0;
  const totalSelected = selectedBoys + selectedGirls;

  /** -------------------------
   *   Filtering + sorting
   *  ------------------------- */
  const filteredPlayers = useMemo(() => {
    let arr = [...allPlayers].map(p => ({ ...p, fantasy: calculatePoints(p) }));
    if (divisionSelected) arr = arr.filter(p => p.__division === divisionSelected);
    if (schoolSelected) arr = arr.filter(p => p.__team === schoolSelected);
    // always sort by fantasy desc
    arr.sort((a, b) => b.fantasy - a.fantasy);
    return arr;
  }, [allPlayers, divisionSelected, schoolSelected, calculatePoints]);

  /** -------------------------
   *   "My Team" dataset
   *  ------------------------- */
  const myTeamPlayers = useMemo(() => {
    const ids = new Set([...(userRoster.boys ?? []), ...(userRoster.girls ?? [])]);
    const enriched = allPlayers
      .filter(p => ids.has(p.id))
      .map(p => ({ ...p, fantasy: calculatePoints(p) }))
      .sort((a, b) => b.fantasy - a.fantasy);
    return enriched;
  }, [allPlayers, userRoster, calculatePoints]);

  /** -------------------------
   *   Player detail modal
   *  ------------------------- */
  const [detail, setDetail] = useState<any | null>(null);

  const confirmRemoveFromTeam = (player: any) => {
    const division = player.__division as 'boys' | 'girls';
    Alert.alert(
      'Remove from Team',
      `Remove ${player.name} from your Fantasy roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            updateRoster(division, player.id);
            setDetail(null);
          },
        },
      ],
    );
  };

  const confirmAddToTeam = (player: any) => {
    const division = player.__division as 'boys' | 'girls';
    const already =
      (division === 'boys' ? userRoster.boys : userRoster.girls)?.includes(player.id) ?? false;

    if (already) {
      confirmRemoveFromTeam(player);
      return;
    }

    const cap = division === 'boys' ? maxBoys : maxGirls;
    const count = division === 'boys' ? selectedBoys : selectedGirls;
    if (count >= cap) {
      Alert.alert(
        'Roster Full',
        `You already have ${cap} ${division === 'boys' ? 'boys' : 'girls'} selected.`,
      );
      return;
    }

    Alert.alert(
      'Add to Team',
      `Add ${player.name} to your Fantasy roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: () => {
            updateRoster(division, player.id);
            setDetail(null);
          },
        },
      ],
    );
  };

  /** -------------------------
   *   Filter button helpers
   *  ------------------------- */
  const onPressFilter = (key: Exclude<FilterKey, null>) => {
    // If filter has a value, tapping its pill clears it
    if (key === 'division' && divisionSelected) { setDivisionSelected(null); return; }
    if (key === 'school' && schoolSelected) { setSchoolSelected(null); return; }
    

    // Open chooser
    if (Platform.OS === 'ios') {
      // Native iOS sheet
      if (key === 'division') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: 'Select Division',
            options: ['Cancel', 'Boys', 'Girls'],
            cancelButtonIndex: 0,
            userInterfaceStyle: 'dark',
          },
          idx => {
            if (idx === 1) setDivisionSelected('boys');
            else if (idx === 2) setDivisionSelected('girls');
          },
        );
      } else if (key === 'school') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: 'Select School',
            options: ['Cancel', ...schoolOptions],
            cancelButtonIndex: 0,
            userInterfaceStyle: 'dark',
          },
          idx => {
            if (idx > 0) setSchoolSelected(schoolOptions[idx - 1]);
          },
        );
      }
    } else {
      // Simple inline sheet for Android/others
      setActiveFilter(prev => (prev === key ? null : key));
    }
  };

  /** -------------------------
   *   Save team
   *  ------------------------- */
  const canSave = selectedBoys === maxBoys && selectedGirls === maxGirls;
  const onSaveTeam = () => {
    if (!canSave) {
      Alert.alert('Almost there!', 'Pick 4 boys and 4 girls to complete your team.');
      return;
    }
    Alert.alert('Team Saved', 'Your fantasy roster has been saved for this session.');
    // TODO: persist to storage / backend here
  };

  /** -------------------------
   *   Render helpers
   *  ------------------------- */
  const Pill = ({
    label,
    active,
    onPress,
  }: { label: string; active?: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const PlayerRow = ({ item }: { item: any }) => {
    const division = item.__division as 'boys' | 'girls';
    const selected =
      (division === 'boys' ? userRoster.boys : userRoster.girls)?.includes(item.id) ?? false;

    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.9} onPress={() => setDetail(item)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.primary} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {item.__team} • {capitalize(division)}
          </Text>
        </View>
        <Text style={styles.points}>{item.fantasy} pts</Text>
        {selected ? <Ionicons name="checkmark-circle" size={20} color={YELLOW} style={{ marginLeft: 8 }} /> : null}
      </TouchableOpacity>
    );
  };

  /** -------------------------
   *   Onboarding screen
   *  ------------------------- */
  if (!hasOnboarded) {
    return (
      <View style={styles.onboardOuter}>
        <Ionicons name="american-football-outline" size={48} color={YELLOW} />
        <Text style={styles.onboardTitle}>Welcome to MYFT 2025 Fantasy Football!</Text>
        <Text style={styles.onboardSub}>
          Press continue to get started building your roster!
        </Text>
        <TouchableOpacity style={styles.cta} onPress={() => setHasOnboarded(true)}>
          <Text style={styles.ctaText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /** -------------------------
   *   Main screen
   *  ------------------------- */
  return (
    <View style={styles.container}>
      {/* Header / progress */}
      <View style={styles.topRow}>
        <View style={styles.counter}>
          <Text style={styles.counterText}>Boys: {selectedBoys}/{maxBoys}</Text>
        </View>
        <View style={styles.counter}>
          <Text style={styles.counterText}>Girls: {selectedGirls}/{maxGirls}</Text>
        </View>
        <TouchableOpacity style={[styles.saveBtn, !canSave && { opacity: 0.6 }]} onPress={onSaveTeam}>
          <Ionicons name="save-outline" size={16} color={NAVY} />
          <Text style={styles.saveBtnText}>Save Team</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          onPress={() => setTab('all')}
          style={[styles.toggleBtn, tab === 'all' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, tab === 'all' && styles.toggleTextActive]}>All Players</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('team')}
          style={[styles.toggleBtn, tab === 'team' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, tab === 'team' && styles.toggleTextActive]}>My Team ({totalSelected})</Text>
        </TouchableOpacity>
      </View>

      {/* Filters (All Players) */}
      {tab === 'all' && (
        <>
          <Text style={styles.filterLabel}>Filters</Text>
          <View style={styles.filterRow}>
            <Pill
              label={`Division${divisionSelected ? `: ${capitalize(divisionSelected)}` : ''}`}
              active={!!divisionSelected}
              onPress={() => onPressFilter('division')}
            />
            <Pill
              label={`School${schoolSelected ? `: ${schoolSelected}` : ''}`}
              active={!!schoolSelected}
              onPress={() => onPressFilter('school')}
            />
          </View>

          {/* Inline sheet for Android/others */}
          {Platform.OS !== 'ios' && activeFilter && (
            <View style={styles.dropdown}>
              {activeFilter === 'division' &&
                (['boys', 'girls'] as const).map(opt => (
                  <TouchableOpacity key={opt} onPress={() => { setDivisionSelected(opt); setActiveFilter(null); }}>
                    <Text style={styles.dropdownItem}>{capitalize(opt)}</Text>
                  </TouchableOpacity>
                ))}
              {activeFilter === 'school' &&
                schoolOptions.map(opt => (
                  <TouchableOpacity key={opt} onPress={() => { setSchoolSelected(opt); setActiveFilter(null); }}>
                    <Text style={styles.dropdownItem}>{opt}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </>
      )}

      {/* Lists */}
      {tab === 'all' ? (
        <FlatList
          data={filteredPlayers}
          keyExtractor={(p: any) => p.id}
          renderItem={({ item }) => <PlayerRow item={item} />}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={myTeamPlayers}
          keyExtractor={(p: any) => p.id}
          renderItem={({ item }) => <PlayerRow item={item} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No players yet. Pick from All Players.</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Player details modal */}
      <Modal
        visible={!!detail}
        transparent
        animationType="fade"
        onRequestClose={() => setDetail(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setDetail(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {detail && (
              <>
                <Text style={styles.modalTitle}>{detail.name}</Text>
                <Text style={styles.modalMeta}>
                  {detail.__team} • {capitalize(detail.__division)}
                </Text>

                <View style={styles.statRow}>
                  <Text style={styles.statText}>Fantasy Points: </Text>
                  <Text style={[styles.statText, { color: YELLOW, fontWeight: '900' }]}>
                    {detail.fantasy ?? calculatePoints(detail)}
                  </Text>
                </View>

                {/* Add / Remove switch */}
                {(() => {
                  const division = detail.__division as 'boys' | 'girls';
                  const isSelected =
                    (division === 'boys' ? userRoster.boys : userRoster.girls)?.includes(detail.id) ?? false;

                  if (isSelected) {
                    return (
                      <TouchableOpacity style={styles.removeBtn} onPress={() => confirmRemoveFromTeam(detail)}>
                        <Ionicons name="trash-outline" size={18} color="#fff" />
                        <Text style={styles.removeBtnText}>Remove Player</Text>
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity style={styles.addBtn} onPress={() => confirmAddToTeam(detail)}>
                      <Ionicons name="add-circle-outline" size={18} color={NAVY} />
                      <Text style={styles.addBtnText}>Add Player</Text>
                    </TouchableOpacity>
                  );
                })()}

                <TouchableOpacity style={styles.closeBtn} onPress={() => setDetail(null)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
            
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** -------------------------
 *   Styles
 *  ------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 12 },

  // Onboarding
  onboardOuter: {
    flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: -50
  },
  onboardTitle: { color: YELLOW, fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 12, fontFamily: FONT_FAMILIES.archivoBlack },
  onboardSub: { color: TEXT, opacity: 0.9, textAlign: 'center', marginTop: 8, fontFamily: FONT_FAMILIES.archivoNarrow},
  cta: {
    marginTop: 16, backgroundColor: YELLOW, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10,
  },
  ctaText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  // Top bar
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  counter: {
    backgroundColor: '#0b3c70', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: LINE,
  },
  counterText: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  saveBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: YELLOW, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  // Tabs
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#062a4e', alignItems: 'center' },
  toggleActive: { backgroundColor: '#0b3c70' },
  toggleText: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  toggleTextActive: { color: YELLOW, fontFamily: FONT_FAMILIES.archivoBlack},

  // Filters
  filterLabel: { color: YELLOW, fontWeight: '700', fontSize: 16, marginBottom: 8, fontFamily: FONT_FAMILIES.archivoBlack },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  pill: { backgroundColor: '#062a4e', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: LINE },
  pillActive: { backgroundColor: YELLOW, borderColor: 'rgba(0,0,0,0.12)' },
  pillText: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  pillTextActive: { color: NAVY, fontFamily: FONT_FAMILIES.archivoBlack},

  dropdown: {
    backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', padding: 8, marginBottom: 8,
  },
  dropdownItem: { color: TEXT, paddingVertical: 10, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },

  // Rows
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: LINE },
  primary: { color: TEXT, fontWeight: '800', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },
  sub: { color: TEXT, fontSize: 12, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow},
  points: { color: YELLOW, fontWeight: '900', fontSize: 16, marginLeft: 8, fontFamily: FONT_FAMILIES.archivoBlack},

  empty: { color: TEXT, textAlign: 'center', marginTop: 30 },

  // Modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '88%', backgroundColor: NAVY, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)' },
  modalTitle: { color: YELLOW, fontSize: 20, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },
  modalMeta: { color: TEXT, marginTop: 6, marginBottom: 12, fontFamily: FONT_FAMILIES.archivoNarrow },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statText: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack},

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: YELLOW, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 8 },
  addBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack},

  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E74C3C', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 8 },
  removeBtnText: { color: '#fff', fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  closeBtn: { paddingVertical: 8, paddingHorizontal: 10 },
  closeBtnText: { color: TEXT, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoBlack },
});
