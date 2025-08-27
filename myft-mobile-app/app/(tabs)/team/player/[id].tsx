// app/(tabs)/leaderboard/player/[id].tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, Modal, Pressable, TouchableOpacity, FlatList } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTournament } from '../../../../context/TournamentContext';
import { scheduleData, statsForRender, SCORING, pointsForLine, type PlayerGameStat } from '../../../data/scheduleData';
import { getTeamLogo } from '../../../../assets/team_logos';
import { FONT_FAMILIES } from '@/assets/fonts';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.18)';

type Totals = {
  touchdowns: number;
  passingTDs: number;
  shortReceptions: number;
  mediumReceptions: number;
  longReceptions: number;
  catches: number;
  flagsPulled: number;
  sacks: number;
  interceptions: number;
  passingInterceptions: number;
};

const EMPTY_TOTALS: Totals = {
  touchdowns: 0, passingTDs: 0, shortReceptions: 0, mediumReceptions: 0, longReceptions: 0,
  catches: 0, flagsPulled: 0, sacks: 0, interceptions: 0, passingInterceptions: 0,
};

export default function PlayerLeaderboardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teams, calculatePoints } = useTournament(); // still available if you want to compare

  const [showBreakdown, setShowBreakdown] = useState(false);

  const player = useMemo(() => {
    for (const t of teams) {
      const p = t.players.find(pl => pl.id === id);
      if (p) return { player: p, teamName: t.name, teamId: t.id };
    }
    return null;
  }, [teams, id]);

  // Aggregate the player's lines across all visible (Live/Final) games
  const aggregated = useMemo(() => {
    if (!id) return { totals: EMPTY_TOTALS, totalPoints: 0 };

    const totals: Totals = { ...EMPTY_TOTALS };
    let points = 0;

    for (const day of scheduleData) {
      for (const g of day.games) {
        const box = statsForRender(g);
        if (!box) continue;
        const lines = [
          ...box.team1.filter(l => l.playerId === id),
          ...box.team2.filter(l => l.playerId === id),
        ];
        for (const line of lines) {
          totals.touchdowns += line.touchdowns;
          totals.passingTDs += line.passingTDs;
          totals.shortReceptions += line.shortReceptions;
          totals.mediumReceptions += line.mediumReceptions;
          totals.longReceptions += line.longReceptions;
          totals.catches += line.catches;
          totals.flagsPulled += line.flagsPulled;
          totals.sacks += line.sacks;
          totals.interceptions += line.interceptions;
          totals.passingInterceptions += line.passingInterceptions;

          points += pointsForLine(line);
        }
      }
    }
    return { totals, totalPoints: points };
  }, [id]);

  if (!player) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: 'Player' }} />
        <Text style={{ color: YELLOW }}>Player not found.</Text>
      </View>
    );
  }

  const { player: p } = player;
  const logoSrc = getTeamLogo(player.teamId);

  // Build rows for the breakdown modal
  const breakdownRows = useMemo(() => {
    const rows = [
      { key: 'TD', label: 'Touchdowns', count: aggregated.totals.touchdowns, mult: SCORING.touchdown },
      { key: 'pTD', label: 'Passing TDs', count: aggregated.totals.passingTDs, mult: SCORING.passingTD },
      { key: 'pINT', label: 'Passing INTs', count: aggregated.totals.passingInterceptions, mult: SCORING.passingInterception },
      { key: 'C', label: 'Catches', count: aggregated.totals.catches, mult: SCORING.catch },
      { key: 'sREC', label: 'Short Gain', count: aggregated.totals.shortReceptions, mult: SCORING.shortReception },
      { key: 'mREC', label: 'Medium Gain', count: aggregated.totals.mediumReceptions, mult: SCORING.mediumReception },
      { key: 'lREC', label: 'Long Gain', count: aggregated.totals.longReceptions, mult: SCORING.longReception },
      { key: 'FLG', label: 'Flag Grabs', count: aggregated.totals.flagsPulled, mult: SCORING.flagGrab },
      { key: 'SACK', label: 'Sacks', count: aggregated.totals.sacks, mult: SCORING.sack },
      { key: 'INT', label: 'Interceptions', count: aggregated.totals.interceptions, mult: SCORING.interception },
    ];
    return rows.map(r => ({ ...r, subtotal: r.count * r.mult }));
  }, [aggregated]);

  return (
    <View style={{ flex: 1, backgroundColor: NAVY }}>
      <Stack.Screen options={{ title: `${p.name}` }} />

      <View style={s.container}>
        {/* Header */}
        <View style={s.headerCard}>
          <View>
            <Text style={s.name}>{p.name}</Text>
            <Text style={s.meta}>{player.teamName}</Text>
          </View>
          <Image source={logoSrc} style={s.logo} resizeMode="contain" />
        </View>

        {/* Bottom fixed-ish card (total points + breakdown button) */}
        <View style={s.bottomCard}>
          <Text style={s.bottomText}>Total Fantasy Points: {aggregated.totalPoints}</Text>
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
            <Text style={s.modalTitle}>Stat Breakdown</Text>

            <View style={[s.rowHead, s.row]}>
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
                  <Text style={[s.cell, s.right, s.totalCell]}>{aggregated.totalPoints}</Text>
                </View>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 12 },

  headerCard: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: { color: YELLOW, fontWeight: '900', fontSize: 20, fontFamily: FONT_FAMILIES.archivoBlack },
  meta: { color: TEXT, marginTop: 4, fontFamily: FONT_FAMILIES.archivoNarrow },

  bottomCard: {
    backgroundColor: CARD,
    padding: 14,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
  },
  bottomText: { color: YELLOW, fontWeight: '900', fontSize: 18, textAlign: 'center', fontFamily: FONT_FAMILIES.archivoBlack },
  breakdownBtn: {
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: YELLOW,
  },
  breakdownBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  // Modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '90%', maxHeight: '80%', backgroundColor: NAVY, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: LINE },
  modalTitle: { color: YELLOW, fontWeight: '900', fontSize: 18, marginBottom: 10, fontFamily: FONT_FAMILIES.archivoBlack },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a3a68', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  rowHead: { backgroundColor: '#0f4a85', marginBottom: 8 },
  footerRow: { marginTop: 10, backgroundColor: '#0f4a85' },

  cellLabel: { color: YELLOW, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  cell: { color: TEXT, fontWeight: '800', width: 60, fontFamily: FONT_FAMILIES.archivoBlack },
  right: { textAlign: 'right' as const },
  totalCell: { color: YELLOW },

  logo: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
});
