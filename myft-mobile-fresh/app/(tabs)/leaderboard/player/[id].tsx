// app/(tabs)/leaderboard/player/[id].tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, Modal, Pressable, TouchableOpacity, FlatList } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTournament, SCORING } from '../../../../TournamentContext';
import { getTeamLogo } from '../../../../team_logos';
import { FONT_FAMILIES } from '../../../../fonts';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.18)';

// --- helpers ---
const toSlug = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');

const humanizeSlug = (slug: string) =>
  slug.split('-').map(w => (w ? w[0].toUpperCase() + w.slice(1) : '')).join(' ');

export default function PlayerLeaderboardDetail() {
  const { id: rawParam } = useLocalSearchParams<{ id: string }>();
  const { teams, calculatePoints } = useTournament();
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Build quick lookups from context
  const { players, teamNameById } = useMemo(() => {
    const allPlayers = teams.flatMap(t => t.players);
    const teamMap = new Map<string, string>();
    for (const t of teams) teamMap.set(t.id, t.name);
    return { players: allPlayers, teamNameById: teamMap };
  }, [teams]);

  // Resolve the route param to a player from context
  const player = useMemo(() => {
    if (!rawParam) return null;
    const raw = decodeURIComponent(Array.isArray(rawParam) ? rawParam[0] : rawParam);
    const normalized = toSlug(raw);

    // 1) exact id match
    let p = players.find(pl => pl.id === raw);
    // 2) normalized id match
    if (!p) p = players.find(pl => pl.id === normalized);
    // 3) last resort: normalize both sides and compare
    if (!p) p = players.find(pl => toSlug(pl.id) === normalized);

    return p ?? null;
  }, [rawParam, players]);

  const displayName = useMemo(() => {
    if (player) return player.name;
    if (!rawParam) return 'Player';
    const raw = Array.isArray(rawParam) ? rawParam[0] : rawParam;
    return humanizeSlug(toSlug(raw));
  }, [player, rawParam]);

  // Team name/logo from context
  const teamName = useMemo(() => (player ? teamNameById.get(player.teamId) ?? '' : ''), [player, teamNameById]);
  const logoSrc = getTeamLogo(teamName); // ← per-team logo

  // Pull counts from aggregated stats in context
  const counts = useMemo(() => {
    const s = player?.stats;
    return {
      touchdowns: s?.touchdowns ?? 0,
      passingTDs: s?.passingTDs ?? 0,
      minimalReceptions: s?.minimalReceptions ?? 0,
      shortReceptions: s?.shortReceptions ?? 0,
      mediumReceptions: s?.mediumReceptions ?? 0,
      longReceptions: s?.longReceptions ?? 0,
      catches: s?.catches ?? 0,
      flagsPulled: s?.flagsPulled ?? 0,
      sacks: s?.sacks ?? 0,
      interceptions: s?.interceptions ?? 0,
      passingInterceptions: s?.passingInterceptions ?? 0,
    };
  }, [player]);

  // Total fantasy points via context scorer
  const totalPoints = useMemo(() => (player ? calculatePoints(player) : 0), [player, calculatePoints]);

  const breakdownRows = useMemo(() => {
    const rows = [
      { key: 'TD',       label: 'Touchdowns',          count: counts.touchdowns,           mult: SCORING.touchdown },
      { key: 'pTD',      label: 'Passing TDs',         count: counts.passingTDs,           mult: SCORING.passingTD },
      { key: 'pINT',     label: 'Passing INTs',        count: counts.passingInterceptions, mult: SCORING.passingInterception },
      { key: 'C',        label: 'Catches',             count: counts.catches,              mult: SCORING.catch },
      { key: 'minREC',   label: 'Minimal Gain',        count: counts.minimalReceptions,    mult: SCORING.minimalReception },
      { key: 'sREC',     label: 'Short Gain',          count: counts.shortReceptions,      mult: SCORING.shortReception },
      { key: 'medREC',   label: 'Medium Gain',         count: counts.mediumReceptions,     mult: SCORING.mediumReception },
      { key: 'lREC',     label: 'Long Gain',           count: counts.longReceptions,       mult: SCORING.longReception },
      { key: 'FLG',      label: 'Flag Grabs',          count: counts.flagsPulled,          mult: SCORING.flagGrab },
      { key: 'SACK',     label: 'Sacks',               count: counts.sacks,                mult: SCORING.sack },
      { key: 'INT',      label: 'Interceptions',       count: counts.interceptions,        mult: SCORING.interception },
    ];
    return rows.map(r => ({ ...r, subtotal: r.count * r.mult }));
  }, [counts]);

  // Loading/empty states (no network now, so just “not found” if player missing)
  if (!player) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: 'Player' }} />
        <Text style={{ color: YELLOW }}>Player not found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: NAVY }}>
      <Stack.Screen options={{ title: displayName }} />

      <View style={s.container}>
        {/* Header */}
        <View style={s.headerCard}>
          <View>
            <Text style={s.name}>{displayName}</Text>
            <Text style={s.meta}>{teamName}</Text>
          </View>
          <View style={s.logoContainer}>
          <Image source={logoSrc} style={s.logo} resizeMode="contain" />
          </View>
        </View>

        {/* Total points + breakdown */}
        <View style={s.bottomCard}>
          <Text style={s.bottomText}>Total Fantasy Points: {totalPoints}</Text>
          <TouchableOpacity style={s.breakdownBtn} onPress={() => setShowBreakdown(true)} activeOpacity={0.9}>
            <Text style={s.breakdownBtnText}>See Stat Breakdown</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Breakdown modal */}
      <Modal
        visible={showBreakdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBreakdown(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setShowBreakdown(false)}>
          <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={s.modalTitle}>{displayName}'s Stats</Text>

            <View style={[s.row, s.rowHead]}>
              <Text style={[s.cellLabel, { flex: 1 }]}>Metric</Text>
              <Text style={[s.cell, s.right]}>Count</Text>
              <Text style={[s.cell, s.right]}>Pts</Text>
              <Text style={[s.cell, s.right]}>Total</Text>
            </View>

            <FlatList
              data={breakdownRows}
              keyExtractor={(r) => r.key}
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
                  <Text style={[s.cell, s.right]} />
                  <Text style={[s.cell, s.right]} />
                  <Text style={[s.cell, s.right]} />
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
    </View>
  );
}

/* styles unchanged */
const s = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  headerCard: { backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: YELLOW, fontWeight: '900', fontSize: 20, fontFamily: FONT_FAMILIES.archivoBlack },
  meta: { color: TEXT, marginTop: 4, fontFamily: FONT_FAMILIES.archivoNarrow },
  bottomCard: { backgroundColor: CARD, padding: 14, borderWidth: 1, borderColor: LINE, borderRadius: 12 },
  bottomText: { color: YELLOW, fontWeight: '900', fontSize: 18, textAlign: 'center', fontFamily: FONT_FAMILIES.archivoBlack },
  breakdownBtn: { marginTop: 10, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: YELLOW },
  breakdownBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '90%', maxHeight: '80%', backgroundColor: NAVY, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: LINE },
  modalTitle: { color: YELLOW, fontWeight: '900', fontSize: 18, marginBottom: 10, fontFamily: FONT_FAMILIES.archivoBlack, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a3a68', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  rowHead: { backgroundColor: '#0f4a85', marginBottom: 8 },
  footerRow: { marginTop: 10, backgroundColor: '#0f4a85' },
  cellLabel: { color: YELLOW, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  cell: { color: TEXT, fontWeight: '800', width: 60, fontFamily: FONT_FAMILIES.archivoBlack },
  right: { textAlign: 'right' as const },
  totalCell: { color: YELLOW },
  closeBtn: { alignSelf: 'center', marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: YELLOW },
  closeBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 15,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },  
  logo: { width: 56, height: 56,},
});
