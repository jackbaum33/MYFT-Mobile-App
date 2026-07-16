import React, { useEffect, useMemo, useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, Image, Modal, Pressable,
  TouchableOpacity, FlatList, ScrollView,
} from 'react-native';
import { RouteProp, useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebaseConfig';
import { useTournament, SCORING } from '../../../../context/TournamentContext';
import { getTeamLogo } from '../../../../team_logos';
import { FONT_FAMILIES } from '../../../../fonts';

export type LeaderboardStackParamList = {
  LeaderboardIndex: undefined;
  Player: { id: string };
  User: { id: string };
};

type PlayerScreenRouteProp = RouteProp<LeaderboardStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NavigationProp<LeaderboardStackParamList, 'Player'>;

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.18)';

type GameHistoryEntry = {
  gameId: string;
  team1Id: string;
  team2Id: string;
  date: string;
  stats: number[];
  fantasyPts: number;
};

function getPlayerImageUrl(playerId: string): string {
  const imageFilename = playerId.replace(/-/g, '');
  return `https://firebasestorage.googleapis.com/v0/b/myft-2025.firebasestorage.app/o/players%2F${playerId}%2F${imageFilename}.jpg?alt=media`;
}

function humanizeTeamId(teamId: string): string {
  return teamId
    .split('-')
    .filter(w => w !== 'boys' && w !== 'girls')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

const STAT_MULTS = [
  SCORING.touchdown,
  SCORING.passingTD,
  SCORING.minimalReception,
  SCORING.shortReception,
  SCORING.mediumReception,
  SCORING.longReception,
  SCORING.catch,
  SCORING.flagGrab,
  SCORING.sack,
  SCORING.interception,
  SCORING.passingInterception,
];

function calcPtsFromArray(arr: number[]): number {
  return arr.reduce((sum, val, i) => sum + (val ?? 0) * (STAT_MULTS[i] ?? 0), 0);
}

function buildBreakdownFromArray(arr: number[]) {
  return [
    { key: 'TD',    label: 'Touchdowns',    count: arr[0]  ?? 0, mult: SCORING.touchdown },
    { key: 'pTD',   label: 'Passing TDs',   count: arr[1]  ?? 0, mult: SCORING.passingTD },
    { key: 'pINT',  label: 'Passing INTs',  count: arr[10] ?? 0, mult: SCORING.passingInterception },
    { key: 'C',     label: 'Catches',       count: arr[6]  ?? 0, mult: SCORING.catch },
    { key: 'minR',  label: 'Minimal Gain',  count: arr[2]  ?? 0, mult: SCORING.minimalReception },
    { key: 'sREC',  label: 'Short Gain',    count: arr[3]  ?? 0, mult: SCORING.shortReception },
    { key: 'mREC',  label: 'Medium Gain',   count: arr[4]  ?? 0, mult: SCORING.mediumReception },
    { key: 'lREC',  label: 'Long Gain',     count: arr[5]  ?? 0, mult: SCORING.longReception },
    { key: 'FLG',   label: 'Flag Grabs',    count: arr[7]  ?? 0, mult: SCORING.flagGrab },
    { key: 'SACK',  label: 'Sacks',         count: arr[8]  ?? 0, mult: SCORING.sack },
    { key: 'INT',   label: 'Interceptions', count: arr[9]  ?? 0, mult: SCORING.interception },
  ].map(r => ({ ...r, subtotal: r.count * r.mult }));
}

const toSlug = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');

const humanizeSlug = (slug: string) =>
  slug.split('-').map(w => (w ? w[0].toUpperCase() + w.slice(1) : '')).join(' ');

export default function PlayerLeaderboardDetail() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const { id: rawParam } = route.params;

  const { teams, calculatePoints } = useTournament();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<GameHistoryEntry | null>(null);

  const { players, teamNameById } = useMemo(() => {
    const allPlayers = teams.flatMap(t => t.players);
    const teamMap = new Map<string, string>();
    for (const t of teams) teamMap.set(t.id, t.name);
    return { players: allPlayers, teamNameById: teamMap };
  }, [teams]);

  const player = useMemo(() => {
    if (!rawParam) return null;
    const raw = decodeURIComponent(rawParam);
    const normalized = toSlug(raw);
    let p = players.find(pl => pl.id === raw);
    if (!p) p = players.find(pl => pl.id === normalized);
    if (!p) p = players.find(pl => toSlug(pl.id) === normalized);
    return p ?? null;
  }, [rawParam, players]);

  const displayName = useMemo(() => {
    if (player) return player.name;
    if (!rawParam) return 'Player';
    return humanizeSlug(toSlug(rawParam));
  }, [player, rawParam]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: displayName });
  }, [navigation, displayName]);

  const teamName = useMemo(
    () => (player ? teamNameById.get(player.teamId) ?? '' : ''),
    [player, teamNameById]
  );
  const logoSrc = getTeamLogo(player?.teamId);
  const playerImageUrl = useMemo(() => (player ? getPlayerImageUrl(player.id) : null), [player]);

  const counts = useMemo(() => {
    const s = player?.stats;
    return {
      touchdowns:           s?.touchdowns           ?? 0,
      passingTDs:           s?.passingTDs           ?? 0,
      minimalReceptions:    s?.minimalReceptions    ?? 0,
      shortReceptions:      s?.shortReceptions      ?? 0,
      mediumReceptions:     s?.mediumReceptions     ?? 0,
      longReceptions:       s?.longReceptions       ?? 0,
      catches:              s?.catches              ?? 0,
      flagsPulled:          s?.flagsPulled          ?? 0,
      sacks:                s?.sacks                ?? 0,
      interceptions:        s?.interceptions        ?? 0,
      passingInterceptions: s?.passingInterceptions ?? 0,
    };
  }, [player]);

  const totalPoints = useMemo(
    () => (player ? calculatePoints(player) : 0),
    [player, calculatePoints]
  );

  const breakdownRows = useMemo(() => {
    return [
      { key: 'TD',     label: 'Touchdowns',    count: counts.touchdowns,           mult: SCORING.touchdown },
      { key: 'pTD',    label: 'Passing TDs',   count: counts.passingTDs,           mult: SCORING.passingTD },
      { key: 'pINT',   label: 'Passing INTs',  count: counts.passingInterceptions, mult: SCORING.passingInterception },
      { key: 'C',      label: 'Catches',       count: counts.catches,              mult: SCORING.catch },
      { key: 'minREC', label: 'Minimal Gain',  count: counts.minimalReceptions,    mult: SCORING.minimalReception },
      { key: 'sREC',   label: 'Short Gain',    count: counts.shortReceptions,      mult: SCORING.shortReception },
      { key: 'medREC', label: 'Medium Gain',   count: counts.mediumReceptions,     mult: SCORING.mediumReception },
      { key: 'lREC',   label: 'Long Gain',     count: counts.longReceptions,       mult: SCORING.longReception },
      { key: 'FLG',    label: 'Flag Grabs',    count: counts.flagsPulled,          mult: SCORING.flagGrab },
      { key: 'SACK',   label: 'Sacks',         count: counts.sacks,                mult: SCORING.sack },
      { key: 'INT',    label: 'Interceptions', count: counts.interceptions,        mult: SCORING.interception },
    ].map(r => ({ ...r, subtotal: r.count * r.mult }));
  }, [counts]);

  // Load game-by-game history for this player
  useEffect(() => {
    if (!player) {
      setGameHistory([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'games'));
        if (!active) return;
        const history: GameHistoryEntry[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          const arr: unknown = data.playerStats?.[player.id];
          if (!Array.isArray(arr)) return;
          const stats = arr as number[];
          const dateStr = data.startTime?.toDate
            ? (data.startTime.toDate() as Date).toLocaleDateString([], { month: 'short', day: 'numeric' })
            : '';
          history.push({
            gameId: docSnap.id,
            team1Id: String(data.team1ID ?? ''),
            team2Id: String(data.team2ID ?? ''),
            date: dateStr,
            stats,
            fantasyPts: calcPtsFromArray(stats),
          });
        });
        history.sort((a, b) => a.date.localeCompare(b.date));
        setGameHistory(history);
      } catch (e) {
        console.warn('[PlayerDetail] failed to load game history:', e);
      }
    })();
    return () => { active = false; };
  }, [player?.id]);

  if (!player) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: YELLOW }}>Player not found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: NAVY }}>
      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* Header */}
        <View style={s.headerCard}>
          <View style={s.playerInfoContainer}>
            {playerImageUrl && !imageError ? (
              <TouchableOpacity onPress={() => setShowEnlargedImage(true)} activeOpacity={0.8}>
                <Image
                  source={{ uri: playerImageUrl }}
                  style={s.playerImage}
                  onError={() => setImageError(true)}
                />
              </TouchableOpacity>
            ) : (
              <View style={s.playerImagePlaceholder}>
                <Ionicons name="person" size={32} color={TEXT} />
              </View>
            )}
            <View style={s.textInfo}>
              <Text style={s.name}>{displayName}</Text>
              <Text style={s.meta}>{teamName}</Text>
            </View>
          </View>
          <View style={s.logoContainer}>
            {logoSrc ? <Image source={logoSrc} style={s.logo} resizeMode="contain" /> : null}
          </View>
        </View>

        {/* Season totals */}
        <View style={s.bottomCard}>
          <Text style={s.bottomText}>Total Fantasy Points: {totalPoints}</Text>
          <TouchableOpacity style={s.breakdownBtn} onPress={() => setShowBreakdown(true)} activeOpacity={0.9}>
            <Text style={s.breakdownBtnText}>Season Breakdown</Text>
          </TouchableOpacity>
        </View>

        {/* Game history */}
        {gameHistory.length > 0 && (
          <View style={s.historyCard}>
            <Text style={s.historyTitle}>Game History</Text>
            {gameHistory.map(entry => (
              <TouchableOpacity
                key={entry.gameId}
                style={s.historyRow}
                onPress={() => setSelectedHistory(entry)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.historyMatchup} numberOfLines={1}>
                    {humanizeTeamId(entry.team1Id)} vs {humanizeTeamId(entry.team2Id)}
                  </Text>
                  {!!entry.date && <Text style={s.historyDate}>{entry.date}</Text>}
                </View>
                <Text style={s.historyPts}>{entry.fantasyPts} pts</Text>
                <Ionicons name="chevron-forward" size={16} color={TEXT} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Season breakdown modal */}
      <Modal visible={showBreakdown} transparent animationType="fade" onRequestClose={() => setShowBreakdown(false)}>
        <Pressable style={s.backdrop} onPress={() => setShowBreakdown(false)}>
          <Pressable style={s.modalCard} onPress={e => e.stopPropagation()}>
            <Text style={s.modalTitle}>{displayName}'s Season Stats</Text>
            <View style={[s.row, s.rowHead]}>
              <Text style={[s.cellLabel, { flex: 1 }]}>Metric</Text>
              <Text style={[s.cell, s.right]}>Count</Text>
              <Text style={[s.cell, s.right]}>Pts</Text>
              <Text style={[s.cell, s.right]}>Total</Text>
            </View>
            <FlatList
              data={breakdownRows}
              keyExtractor={r => r.key}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <View style={s.row}>
                  <Text style={[s.cellLabel, { flex: 1 }]} numberOfLines={1}>{item.label}</Text>
                  <Text style={[s.cell, s.right]}>{item.count}</Text>
                  <Text style={[s.cell, s.right]}>{item.mult}</Text>
                  <Text style={[s.cell, s.right, s.totalCell]}>{item.subtotal}</Text>
                </View>
              )}
              ListFooterComponent={
                <View style={[s.row, s.footerRow]}>
                  <Text style={[s.cellLabel, { flex: 1 }]}>Total Points</Text>
                  <Text style={[s.cell, s.right]} /><Text style={[s.cell, s.right]} /><Text style={[s.cell, s.right]} />
                  <Text style={[s.cell, s.right, s.totalCell]}>{totalPoints}</Text>
                </View>
              }
            />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowBreakdown(false)}>
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Game history breakdown modal */}
      <Modal visible={!!selectedHistory} transparent animationType="fade" onRequestClose={() => setSelectedHistory(null)}>
        <Pressable style={s.backdrop} onPress={() => setSelectedHistory(null)}>
          <Pressable style={s.modalCard} onPress={e => e.stopPropagation()}>
            {selectedHistory && (() => {
              const rows = buildBreakdownFromArray(selectedHistory.stats);
              const total = selectedHistory.fantasyPts;
              return (
                <>
                  <Text style={s.modalTitle}>{displayName}'s Game Stats</Text>
                  <Text style={s.modalSubtitle}>
                    {humanizeTeamId(selectedHistory.team1Id)} vs {humanizeTeamId(selectedHistory.team2Id)}
                    {selectedHistory.date ? `  •  ${selectedHistory.date}` : ''}
                  </Text>
                  <View style={[s.row, s.rowHead]}>
                    <Text style={[s.cellLabel, { flex: 1 }]}>Metric</Text>
                    <Text style={[s.cell, s.right]}>Count</Text>
                    <Text style={[s.cell, s.right]}>Pts</Text>
                    <Text style={[s.cell, s.right]}>Total</Text>
                  </View>
                  <FlatList
                    data={rows}
                    keyExtractor={r => r.key}
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                    renderItem={({ item }) => (
                      <View style={s.row}>
                        <Text style={[s.cellLabel, { flex: 1 }]} numberOfLines={1}>{item.label}</Text>
                        <Text style={[s.cell, s.right]}>{item.count}</Text>
                        <Text style={[s.cell, s.right]}>{item.mult}</Text>
                        <Text style={[s.cell, s.right, s.totalCell]}>{item.subtotal}</Text>
                      </View>
                    )}
                    ListFooterComponent={
                      <View style={[s.row, s.footerRow]}>
                        <Text style={[s.cellLabel, { flex: 1 }]}>Total Points</Text>
                        <Text style={[s.cell, s.right]} /><Text style={[s.cell, s.right]} /><Text style={[s.cell, s.right]} />
                        <Text style={[s.cell, s.right, s.totalCell]}>{total}</Text>
                      </View>
                    }
                  />
                  <TouchableOpacity style={s.closeBtn} onPress={() => setSelectedHistory(null)}>
                    <Text style={s.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Enlarged image modal */}
      <Modal visible={showEnlargedImage} transparent animationType="fade" onRequestClose={() => setShowEnlargedImage(false)}>
        <Pressable style={s.imageModalBackdrop} onPress={() => setShowEnlargedImage(false)}>
          <View style={s.enlargedImageContainer}>
            {playerImageUrl && !imageError && (
              <Image source={{ uri: playerImageUrl }} style={s.enlargedImage} resizeMode="contain" onError={() => setImageError(true)} />
            )}
            <TouchableOpacity style={s.closeImageBtn} onPress={() => setShowEnlargedImage(false)}>
              <Text style={s.closeImageBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  scrollContent: { padding: 12, paddingBottom: 32 },

  headerCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerInfoContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  playerImage: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
  playerImagePlaceholder: {
    width: 56, height: 56, borderRadius: 28, marginRight: 12,
    backgroundColor: '#062a4e', alignItems: 'center', justifyContent: 'center',
  },
  textInfo: { flex: 1 },
  name: { color: YELLOW, fontWeight: '900', fontSize: 20, fontFamily: FONT_FAMILIES.archivoBlack },
  meta: { color: TEXT, marginTop: 4, fontFamily: FONT_FAMILIES.archivoNarrow },

  bottomCard: { backgroundColor: CARD, padding: 14, borderWidth: 1, borderColor: LINE, borderRadius: 12, marginBottom: 12 },
  bottomText: { color: YELLOW, fontWeight: '900', fontSize: 18, textAlign: 'center', fontFamily: FONT_FAMILIES.archivoBlack },
  breakdownBtn: { marginTop: 10, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: YELLOW },
  breakdownBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  historyCard: { backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: LINE },
  historyTitle: {
    color: YELLOW, fontWeight: '900', fontSize: 16,
    fontFamily: FONT_FAMILIES.archivoBlack, marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0a3a68', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8,
  },
  historyMatchup: { color: TEXT, fontWeight: '800', fontSize: 13, fontFamily: FONT_FAMILIES.archivoBlack },
  historyDate: { color: TEXT, fontSize: 11, opacity: 0.7, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow },
  historyPts: { color: YELLOW, fontWeight: '900', fontSize: 14, fontFamily: FONT_FAMILIES.archivoBlack },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '90%', maxHeight: '80%', backgroundColor: NAVY, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: LINE },
  modalTitle: { color: YELLOW, fontWeight: '900', fontSize: 18, marginBottom: 4, fontFamily: FONT_FAMILIES.archivoBlack, textAlign: 'center' },
  modalSubtitle: { color: TEXT, fontSize: 12, textAlign: 'center', marginBottom: 10, fontFamily: FONT_FAMILIES.archivoNarrow, opacity: 0.8 },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a3a68', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  rowHead: { backgroundColor: '#0f4a85', marginBottom: 8 },
  footerRow: { marginTop: 10, backgroundColor: '#0f4a85' },
  cellLabel: { color: YELLOW, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  cell: { color: TEXT, fontWeight: '800', width: 60, fontFamily: FONT_FAMILIES.archivoBlack },
  right: { textAlign: 'right' as const },
  totalCell: { color: YELLOW },
  closeBtn: { alignSelf: 'center', marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: YELLOW },
  closeBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  logoContainer: { width: 32, height: 32, borderRadius: 6, marginRight: 15, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 56, height: 56 },

  imageModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  enlargedImageContainer: { width: '90%', height: '70%', justifyContent: 'center', alignItems: 'center' },
  enlargedImage: { width: '100%', height: '90%', borderRadius: 12 },
  closeImageBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: YELLOW, borderRadius: 8 },
  closeImageBtnText: { color: NAVY, fontWeight: '900', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },
});
