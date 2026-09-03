// screens/DraftRoomScreen.tsx - live draft room: turn strip, board/team toggle, pull-up available-players sheet
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  ActionSheetIOS,
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
import { getPlayerImageUrl, getTeamLogoUrl } from '../../utils/fantasy';
import { FONT_FAMILIES } from '../../fonts';
import type { FantasyStackParamList } from '../(tabs)/fantasy/_layout';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.12)';
const BOYS_COLOR = '#1565C0';
const GIRLS_COLOR = '#C2185B';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_PEEK = 76;
const SHEET_HEIGHT = Math.round(SCREEN_H * 0.72);
const SHEET_MAX_TRANSLATE = SHEET_HEIGHT - SHEET_PEEK;
const BOARD_HEIGHT = Math.round(SCREEN_H * 0.4);
const BOARD_CELL_W = 150;
const BOARD_CELL_H = 60;

type RouteProp_ = RouteProp<FantasyStackParamList, 'DraftRoom'>;
type MappedPlayer = {
  id: string;
  name: string;
  team: string;
  teamId: string;
  abbreviation?: string;
  color?: string;
  division: Division;
  fantasy: number;
};
type FilterKey = 'division' | 'school' | null;

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function initials(name: string) {
  return name ? name.trim().charAt(0).toUpperCase() : '?';
}

function cellBackgroundColor(player?: MappedPlayer) {
  if (!player) return '#062a4e';
  const base = player.color || (player.division === 'boys' ? BOYS_COLOR : GIRLS_COLOR);
  return `${base}59`;
}

/** Draft-board cell avatar: player photo, falling back to the team logo, then a placeholder icon. */
function PickAvatar({ player }: { player: MappedPlayer }) {
  const [playerImgError, setPlayerImgError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  if (!playerImgError) {
    return (
      <Image
        source={{ uri: getPlayerImageUrl(player.id) }}
        style={styles.boardCellAvatar}
        onError={() => setPlayerImgError(true)}
      />
    );
  }
  if (!logoError) {
    return (
      <Image
        source={{ uri: getTeamLogoUrl(player.teamId) }}
        style={styles.boardCellAvatar}
        onError={() => setLogoError(true)}
      />
    );
  }
  return (
    <View style={styles.boardCellAvatarFallback}>
      <Ionicons name="person" size={12} color={TEXT} />
    </View>
  );
}

/** Draggable pull-up sheet built on Animated + PanResponder (no extra deps). */
function PlayerSheet({ count, children }: { count: number; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const translateY = useRef(new Animated.Value(SHEET_MAX_TRANSLATE)).current;
  const dragStart = useRef(SHEET_MAX_TRANSLATE);

  const snapTo = (toValue: number, isExpanded: boolean) => {
    setExpanded(isExpanded);
    Animated.spring(translateY, { toValue, useNativeDriver: true, bounciness: 4 }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => {
        translateY.stopAnimation((value) => {
          dragStart.current = value;
        });
      },
      onPanResponderMove: (_evt, g) => {
        const next = Math.min(SHEET_MAX_TRANSLATE, Math.max(0, dragStart.current + g.dy));
        translateY.setValue(next);
      },
      onPanResponderRelease: (_evt, g) => {
        const current = Math.min(SHEET_MAX_TRANSLATE, Math.max(0, dragStart.current + g.dy));
        if (g.vy < -0.3 || (g.vy <= 0.3 && current < SHEET_MAX_TRANSLATE / 2)) {
          snapTo(0, true);
        } else {
          snapTo(SHEET_MAX_TRANSLATE, false);
        }
      },
    })
  ).current;

  const toggle = () => snapTo(expanded ? SHEET_MAX_TRANSLATE : 0, !expanded);

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
      <View {...panResponder.panHandlers}>
        <TouchableOpacity onPress={toggle} activeOpacity={0.85} style={styles.sheetHandleTouchable}>
          <View style={styles.sheetGrip} />
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>Available Players</Text>
            <View style={styles.sheetCountPill}>
              <Text style={styles.sheetCountText}>{count}</Text>
            </View>
            <Ionicons name={expanded ? 'chevron-down' : 'chevron-up'} size={18} color={TEXT} />
          </View>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Animated.View>
  );
}

function DraftBoard({
  league,
  draftOrder,
  playersById,
  pickByNumber,
  usersByUid,
}: {
  league: LeagueWithId;
  draftOrder: string[];
  playersById: Map<string, MappedPlayer>;
  pickByNumber: Map<number, DraftPickWithId>;
  usersByUid: Map<string, UserProfile>;
}) {
  const n = draftOrder.length;
  const totalRounds = n > 0 ? Math.max(1, Math.round((league.totalPicks ?? n) / n)) : 0;

  const roundAssignments = useMemo(() => {
    const out: Map<string, number>[] = [];
    for (let r = 0; r < totalRounds; r++) {
      const m = new Map<string, number>();
      for (let i = 0; i < n; i++) {
        const pn = r * n + i;
        const uid = pickerForNumber(league, pn);
        if (uid) m.set(uid, pn);
      }
      out.push(m);
    }
    return out;
  }, [league, totalRounds, n]);

  if (n === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
      <View>
        <View style={styles.boardHeaderRow}>
          {draftOrder.map((uid) => (
            <View key={uid} style={[styles.boardHeaderCell, { width: BOARD_CELL_W }]}>
              <Text style={styles.boardHeaderText} numberOfLines={1}>
                {usersByUid.get(uid)?.displayName ?? uid}
              </Text>
            </View>
          ))}
        </View>
        <ScrollView style={{ maxHeight: BOARD_HEIGHT }} showsVerticalScrollIndicator={false}>
          {Array.from({ length: totalRounds }).map((_, r) => (
            <View key={r} style={styles.boardRow}>
              {draftOrder.map((uid) => {
                const pn = roundAssignments[r]?.get(uid);
                const pick = pn != null ? pickByNumber.get(pn) : undefined;
                const player = pick ? playersById.get(pick.playerId) : undefined;
                const isOnClock = pn != null && !pick && pn === (league.currentPickNumber ?? -1);
                return (
                  <View
                    key={uid}
                    style={[
                      styles.boardCell,
                      { width: BOARD_CELL_W, height: BOARD_CELL_H, backgroundColor: cellBackgroundColor(player) },
                      isOnClock && styles.boardCellOnClock,
                    ]}
                  >
                    {player ? (
                      <View style={styles.boardCellContent}>
                        <PickAvatar player={player} />
                        <View style={styles.boardCellText}>
                          <Text style={styles.boardCellName} numberOfLines={1}>
                            {player.name}
                          </Text>
                          <Text style={styles.boardCellSub} numberOfLines={1}>
                            {player.division === 'boys' ? 'M' : 'F'} • {player.abbreviation || player.team}
                          </Text>
                        </View>
                      </View>
                    ) : isOnClock ? (
                      <Text style={styles.boardCellClockText}>On the clock</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

function RosterSlotRow({ player, division }: { player: MappedPlayer | null; division: Division }) {
  if (!player) {
    return (
      <View style={[styles.rosterSlot, styles.rosterSlotEmpty]}>
        <Text style={styles.rosterSlotEmptyText}>Empty {division === 'boys' ? 'Boys' : 'Girls'} Slot</Text>
      </View>
    );
  }
  return (
    <View style={styles.rosterSlot}>
      <Text style={styles.rosterSlotName} numberOfLines={1}>{player.name}</Text>
      <Text style={styles.rosterSlotSub} numberOfLines={1}>{player.team}</Text>
      <Text style={styles.rosterSlotPoints}>{player.fantasy} pts</Text>
    </View>
  );
}

function TeamView({
  league,
  picks,
  draftOrder,
  usersByUid,
  myUid,
  playersById,
}: {
  league: LeagueWithId;
  picks: DraftPickWithId[];
  draftOrder: string[];
  usersByUid: Map<string, UserProfile>;
  myUid: string | undefined;
  playersById: Map<string, MappedPlayer>;
}) {
  const [selectedUid, setSelectedUid] = useState(myUid ?? draftOrder[0]);

  useEffect(() => {
    if (myUid) setSelectedUid(myUid);
  }, [myUid]);

  const roster = useMemo(() => {
    const boys: (MappedPlayer | null)[] = Array(league.boysPerTeam).fill(null);
    const girls: (MappedPlayer | null)[] = Array(league.girlsPerTeam).fill(null);
    let bi = 0;
    let gi = 0;
    picks
      .filter((p) => p.uid === selectedUid)
      .sort((a, b) => a.pickNumber - b.pickNumber)
      .forEach((p) => {
        const player = playersById.get(p.playerId);
        if (!player) return;
        if (p.division === 'boys' && bi < boys.length) boys[bi++] = player;
        else if (p.division === 'girls' && gi < girls.length) girls[gi++] = player;
      });
    return { boys, girls };
  }, [picks, selectedUid, league.boysPerTeam, league.girlsPerTeam, playersById]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.teamChipRow}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
      >
        {draftOrder.map((uid) => (
          <TouchableOpacity
            key={uid}
            onPress={() => setSelectedUid(uid)}
            style={[styles.teamChip, selectedUid === uid && styles.teamChipActive]}
          >
            <Text style={[styles.teamChipText, selectedUid === uid && styles.teamChipTextActive]} numberOfLines={1}>
              {uid === myUid ? 'You' : usersByUid.get(uid)?.displayName ?? uid}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: SHEET_PEEK + 24 }}>
        <Text style={styles.teamSectionLabel}>Boys</Text>
        {roster.boys.map((p, i) => (
          <RosterSlotRow key={`b${i}`} player={p} division="boys" />
        ))}
        <Text style={styles.teamSectionLabel}>Girls</Text>
        {roster.girls.map((p, i) => (
          <RosterSlotRow key={`g${i}`} player={p} division="girls" />
        ))}
      </ScrollView>
    </View>
  );
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
  const [view, setView] = useState<'board' | 'team'>('board');
  const [divisionFilter, setDivisionFilter] = useState<Division | null>(null);
  const [schoolFilter, setSchoolFilter] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>(null);

  useEffect(() => subscribeToLeague(leagueId, setLeague), [leagueId]);
  useEffect(() => subscribeToPicks(leagueId, setPicks), [leagueId]);
  useEffect(() => {
    listUsers().then(setUsers).catch((e) => console.warn('[DraftRoom] listUsers failed:', e));
  }, []);

  const usersByUid = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);
  const nameFor = (uid: string) => usersByUid.get(uid)?.displayName ?? uid;

  const allPlayers = useMemo(
    (): MappedPlayer[] =>
      teams.flatMap((t) =>
        t.players.map((p) => ({
          id: p.id,
          name: p.name,
          team: t.name,
          teamId: t.id,
          abbreviation: t.abbreviation,
          color: t.color,
          division: t.division,
          fantasy: calculatePoints(p),
        }))
      ),
    [teams, calculatePoints]
  );
  const playersById = useMemo(() => new Map(allPlayers.map((p) => [p.id, p])), [allPlayers]);

  const schoolOptions = useMemo(() => Array.from(new Set(teams.map((t) => t.name))).sort(), [teams]);

  const draftedIds = useMemo(() => new Set(picks.map((p) => p.playerId)), [picks]);
  const pickByNumber = useMemo(() => {
    const m = new Map<number, DraftPickWithId>();
    picks.forEach((p) => m.set(p.pickNumber, p));
    return m;
  }, [picks]);

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
    if (divisionFilter) arr = arr.filter((p) => p.division === divisionFilter);
    if (schoolFilter) arr = arr.filter((p) => p.team === schoolFilter);
    const q = search.trim().toLowerCase();
    if (q) arr = arr.filter((p) => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    return arr.sort((a, b) => b.fantasy - a.fantasy);
  }, [allPlayers, draftedIds, eligibleDivisions, divisionFilter, schoolFilter, search]);

  const lastPick = picks.length > 0 ? picks[picks.length - 1] : null;
  const lastPickPlayer = lastPick ? playersById.get(lastPick.playerId) : undefined;

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

  const onPressFilter = (key: Exclude<FilterKey, null>) => {
    if (key === 'division' && divisionFilter) {
      setDivisionFilter(null);
      return;
    }
    if (key === 'school' && schoolFilter) {
      setSchoolFilter(null);
      return;
    }

    if (Platform.OS === 'ios') {
      if (key === 'division') {
        ActionSheetIOS.showActionSheetWithOptions(
          { title: 'Select Division', options: ['Cancel', 'Boys', 'Girls'], cancelButtonIndex: 0, userInterfaceStyle: 'dark' },
          (idx) => {
            if (idx === 1) setDivisionFilter('boys');
            else if (idx === 2) setDivisionFilter('girls');
          }
        );
      } else {
        ActionSheetIOS.showActionSheetWithOptions(
          { title: 'Select School', options: ['Cancel', ...schoolOptions], cancelButtonIndex: 0, userInterfaceStyle: 'dark' },
          (idx) => {
            if (idx > 0) setSchoolFilter(schoolOptions[idx - 1]);
          }
        );
      }
    } else {
      setActiveFilter((prev) => (prev === key ? null : key));
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
  const draftOrder = league.draftOrder && league.draftOrder.length > 0 ? league.draftOrder : league.memberUids;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.turnStrip}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
      >
        {draftOrder.map((uid) => {
          const profile = usersByUid.get(uid);
          const hasError = imageErrors.has(`user-${uid}`);
          const onClock = uid === onTheClockUid;
          return (
            <View key={uid} style={styles.turnItem}>
              {profile?.photoUrl && !hasError ? (
                <Image
                  source={{ uri: profile.photoUrl }}
                  style={[styles.turnAvatarImg, onClock && styles.turnAvatarActive]}
                  onError={() => setImageErrors((prev) => new Set(prev).add(`user-${uid}`))}
                />
              ) : (
                <View style={[styles.turnAvatarFallback, onClock && styles.turnAvatarActive]}>
                  <Text style={styles.turnAvatarText}>{initials(profile?.displayName ?? uid)}</Text>
                </View>
              )}
              <Text style={[styles.turnName, onClock && styles.turnNameActive]} numberOfLines={1}>
                {uid === user?.uid ? 'You' : profile?.displayName ?? uid}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.banner, isMyTurn && styles.bannerMine]}>
        <Text style={styles.bannerText}>
          {isMyTurn ? "You're on the clock!" : `On the clock: ${onTheClockUid ? nameFor(onTheClockUid) : '—'}`}
        </Text>
        <Text style={styles.bannerSub}>
          Pick {(league.currentPickNumber ?? 0) + 1} of {league.totalPicks ?? 0} • Round {round + 1}
        </Text>
        {lastPick && (
          <Text style={styles.bannerLast} numberOfLines={1}>
            Last: {lastPickPlayer?.name ?? lastPick.playerId} ({nameFor(lastPick.uid)})
          </Text>
        )}
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity onPress={() => setView('board')} style={[styles.toggleBtn, view === 'board' && styles.toggleActive]}>
          <Text style={[styles.toggleText, view === 'board' && styles.toggleTextActive]}>Board</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setView('team')} style={[styles.toggleBtn, view === 'team' && styles.toggleActive]}>
          <Text style={[styles.toggleText, view === 'team' && styles.toggleTextActive]}>Team</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {view === 'board' ? (
          <DraftBoard
            league={league}
            draftOrder={draftOrder}
            playersById={playersById}
            pickByNumber={pickByNumber}
            usersByUid={usersByUid}
          />
        ) : (
          <TeamView
            league={league}
            picks={picks}
            draftOrder={draftOrder}
            usersByUid={usersByUid}
            myUid={user?.uid}
            playersById={playersById}
          />
        )}
      </View>

      <PlayerSheet count={availablePlayers.length}>
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

        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => onPressFilter('division')}
            style={[styles.filterBtn, !!divisionFilter && styles.filterBtnActive]}
          >
            <Text style={[styles.filterBtnText, !!divisionFilter && styles.filterBtnTextActive]}>
              {`Division${divisionFilter ? `: ${capitalize(divisionFilter)}` : ''}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onPressFilter('school')}
            style={[styles.filterBtn, !!schoolFilter && styles.filterBtnActive]}
          >
            <Text style={[styles.filterBtnText, !!schoolFilter && styles.filterBtnTextActive]}>
              {`School${schoolFilter ? `: ${schoolFilter}` : ''}`}
            </Text>
          </TouchableOpacity>
          {(divisionFilter || schoolFilter) && (
            <TouchableOpacity onPress={() => { setDivisionFilter(null); setSchoolFilter(null); }} style={styles.filterBtn}>
              <Text style={styles.filterBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {Platform.OS !== 'ios' && activeFilter && (
          <View style={styles.dropdown}>
            {activeFilter === 'division' &&
              (['boys', 'girls'] as const).map((opt) => (
                <TouchableOpacity key={opt} onPress={() => { setDivisionFilter(opt); setActiveFilter(null); }}>
                  <Text style={styles.dropdownItem}>{capitalize(opt)}</Text>
                </TouchableOpacity>
              ))}
            {activeFilter === 'school' &&
              schoolOptions.map((opt) => (
                <TouchableOpacity key={opt} onPress={() => { setSchoolFilter(opt); setActiveFilter(null); }}>
                  <Text style={styles.dropdownItem}>{opt}</Text>
                </TouchableOpacity>
              ))}
          </View>
        )}

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
              <View style={[styles.playerRow, !isMyTurn && styles.playerRowDisabled]}>
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
                <TouchableOpacity
                  style={[styles.draftBtn, (!isMyTurn || isSubmitting) && styles.draftBtnDisabled]}
                  activeOpacity={0.85}
                  disabled={!isMyTurn || isSubmitting}
                  onPress={() => onPickPlayer(item.id, item.division)}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={NAVY} size="small" />
                  ) : (
                    <Text style={styles.draftBtnText}>Draft</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </PlayerSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  center: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', padding: 24 },

  completeTitle: { color: YELLOW, fontSize: 22, fontWeight: '900', marginTop: 16, fontFamily: FONT_FAMILIES.archivoBlack },
  helperText: { color: TEXT, opacity: 0.75, textAlign: 'center', marginTop: 8, fontFamily: FONT_FAMILIES.archivoNarrow },

  turnStrip: { maxHeight: 68, marginTop: 8 },
  turnItem: { alignItems: 'center', width: 60 },
  turnAvatarImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  turnAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#062a4e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  turnAvatarActive: { borderColor: YELLOW },
  turnAvatarText: { color: TEXT, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },
  turnName: { color: TEXT, opacity: 0.75, fontSize: 11, marginTop: 4, fontFamily: FONT_FAMILIES.archivoNarrow },
  turnNameActive: { color: YELLOW, opacity: 1, fontWeight: '700' },

  banner: { backgroundColor: CARD, padding: 14, margin: 12, marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: LINE },
  bannerMine: { backgroundColor: YELLOW },
  bannerText: { color: TEXT, fontWeight: '900', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },
  bannerSub: { color: TEXT, opacity: 0.85, fontSize: 12, marginTop: 4, fontFamily: FONT_FAMILIES.archivoNarrow },
  bannerLast: { color: TEXT, opacity: 0.85, fontSize: 12, marginTop: 6, fontFamily: FONT_FAMILIES.archivoNarrow },

  toggleRow: { flexDirection: 'row', gap: 8, marginHorizontal: 12, marginBottom: 10 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#062a4e', alignItems: 'center' },
  toggleActive: { backgroundColor: '#0b3c70' },
  toggleText: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  toggleTextActive: { color: YELLOW, fontFamily: FONT_FAMILIES.archivoBlack },

  boardHeaderRow: { flexDirection: 'row', paddingHorizontal: 12 },
  boardHeaderCell: { paddingVertical: 8, paddingHorizontal: 6 },
  boardHeaderText: { color: YELLOW, fontWeight: '800', fontSize: 12, fontFamily: FONT_FAMILIES.archivoBlack },
  boardRow: { flexDirection: 'row', paddingHorizontal: 12 },
  boardCell: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    margin: 2,
    padding: 6,
    justifyContent: 'center',
  },
  boardCellOnClock: { borderColor: YELLOW, borderWidth: 2 },
  boardCellContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  boardCellAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: NAVY },
  boardCellAvatarFallback: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardCellText: { flex: 1 },
  boardCellName: { color: TEXT, fontWeight: '800', fontSize: 12, fontFamily: FONT_FAMILIES.archivoBlack },
  boardCellSub: { color: TEXT, opacity: 0.85, fontSize: 10, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow },
  boardCellClockText: { color: YELLOW, fontWeight: '800', fontSize: 11, marginTop: 2, fontFamily: FONT_FAMILIES.archivoBlack },

  teamChipRow: { maxHeight: 48, marginBottom: 8 },
  teamChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: LINE },
  teamChipActive: { backgroundColor: YELLOW, borderColor: YELLOW },
  teamChipText: { color: TEXT, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoBlack },
  teamChipTextActive: { color: NAVY },
  teamSectionLabel: { color: YELLOW, fontWeight: '700', fontSize: 14, marginTop: 8, marginBottom: 8, fontFamily: FONT_FAMILIES.archivoBlack },

  rosterSlot: { backgroundColor: CARD, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: LINE },
  rosterSlotEmpty: { opacity: 0.5 },
  rosterSlotEmptyText: { color: TEXT, fontFamily: FONT_FAMILIES.archivoNarrow },
  rosterSlotName: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  rosterSlotSub: { color: TEXT, opacity: 0.7, fontSize: 12, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow },
  rosterSlotPoints: { color: YELLOW, fontWeight: '900', marginTop: 4, fontFamily: FONT_FAMILIES.archivoBlack },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    backgroundColor: CARD,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  sheetHandleTouchable: { paddingTop: 10, paddingBottom: 8 },
  sheetGrip: { width: 40, height: 4, borderRadius: 2, backgroundColor: LINE, alignSelf: 'center', marginBottom: 8 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  sheetTitle: { color: YELLOW, fontWeight: '800', fontSize: 15, fontFamily: FONT_FAMILIES.archivoBlack },
  sheetCountPill: { backgroundColor: '#062a4e', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  sheetCountText: { color: TEXT, fontWeight: '700', fontSize: 12, fontFamily: FONT_FAMILIES.archivoBlack },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#062a4e',
    borderRadius: 12,
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: LINE,
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 15, paddingVertical: 10, fontFamily: FONT_FAMILIES.archivoNarrow },

  filterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginHorizontal: 12, flexWrap: 'wrap', gap: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#062a4e' },
  filterBtnActive: { backgroundColor: YELLOW },
  filterBtnText: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  filterBtnTextActive: { color: NAVY, fontFamily: FONT_FAMILIES.archivoBlack },

  dropdown: { backgroundColor: '#062a4e', borderRadius: 10, borderWidth: 1, borderColor: LINE, padding: 8, marginHorizontal: 12, marginTop: 8 },
  dropdownItem: { color: TEXT, paddingVertical: 10, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },

  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#062a4e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: LINE,
  },
  playerRowDisabled: { opacity: 0.5 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  playerName: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  playerSub: { color: TEXT, opacity: 0.7, fontSize: 12, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow },

  draftBtn: { backgroundColor: YELLOW, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9, marginLeft: 8 },
  draftBtnDisabled: { opacity: 0.4 },
  draftBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },
});
