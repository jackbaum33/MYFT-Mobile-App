// app/(tabs)/schedule/[id].tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FONT_FAMILIES } from '@/assets/fonts';
import {
  findGameById,
  statsForRender,
  type PlayerGameStat,
  type Game,
  derivedPoints,
  SCORING,
} from '../../data/scheduleData';
import { useTournament } from '../../../context/TournamentContext';
import { getTeamLogo } from '../../../assets/team_logos';

type Row = {
  playerId: string;
  name: string;
  td: number;               // only TD shown in grid
  line: PlayerGameStat;     // full line for modal breakdown
};

const CARD = '#00417D';
const NAVY = '#00274C';
const TEXT = '#E9ECEF';
const YELLOW = '#FFCB05';
const LINE = 'rgba(255,255,255,0.18)';

export default function GameDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teams } = useTournament();

  const [side, setSide] = useState<'team1' | 'team2'>('team1');
  const [detail, setDetail] = useState<{ name: string; line: PlayerGameStat } | null>(null);

  const found = useMemo(() => findGameById(id), [id]);
  if (!found) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Stack.Screen
          options={{
            title: 'Box Score',
            headerStyle: { backgroundColor: NAVY },
            headerTintColor: YELLOW,
            headerTitleStyle: { color: YELLOW, fontWeight: 'bold', fontFamily: FONT_FAMILIES.archivoBlack },
          }}
        />
        <Text style={styles.empty}>Game not found.</Text>
      </View>
    );
  }

  const { game } = found;

  // resolve teams, names, captains, logos
  const t1 = teams.find(t => t.id === game.team1);
  const t2 = teams.find(t => t.id === game.team2);

  const name1   = t1?.name ?? game.team1;
  const name2   = t2?.name ?? game.team2;
  const cap1Last = t1?.captain ? t1.captain.trim().split(/\s+/).slice(-1)[0] : '';
  const cap2Last = t2?.captain ? t2.captain.trim().split(/\s+/).slice(-1)[0] : '';
  const logo1   = getTeamLogo(game.team1);
  const logo2   = getTeamLogo(game.team2);

  // Merge roster with this game's per-player lines so all players appear (zeroed if no line yet)
  const merge = (teamId: string, which: 'team1' | 'team2'): Row[] => {
    const team = teams.find(t => t.id === teamId);
    const box = statsForRender(game);
    const lines: PlayerGameStat[] = which === 'team1' ? (box?.team1 ?? []) : (box?.team2 ?? []);

    const lineById = new Map(lines.map(l => [l.playerId, l]));
    return (team?.players ?? []).map(p => {
      const l: PlayerGameStat = lineById.get(p.id) ?? {
        playerId: p.id,
        touchdowns: 0,
        passingTDs: 0,
        shortReceptions: 0,
        mediumReceptions: 0,
        longReceptions: 0,
        catches: 0,
        flagsPulled: 0,
        sacks: 0,
        interceptions: 0,
        passingInterceptions: 0,
      };
      return {
        playerId: p.id,
        name: p.name,
        td: l.touchdowns ?? 0,
        line: l,
      };
    });
  };

  const activeTeamId = side === 'team1' ? game.team1 : game.team2;
  const rows = merge(activeTeamId, side);
  const activeTeamName = side === 'team1' ? name1 : name2;

  // Compute per-player breakdown rows for modal (Metric | Count | Pts | Total)
  const computeBreakdown = (line: PlayerGameStat) => {
    const items = [
      { key: 'TD',   label: 'Touchdowns',        count: line.touchdowns ?? 0,           mult: SCORING.touchdown },
      { key: 'pTD',  label: 'Passing TDs',       count: line.passingTDs ?? 0,           mult: SCORING.passingTD },
      { key: 'pINT', label: 'Passing INTs',      count: line.passingInterceptions ?? 0, mult: SCORING.passingInterception },
      { key: 'C',    label: 'Catches',           count: line.catches ?? 0,              mult: SCORING.catch },
      { key: 'sREC', label: 'Short Gain',        count: line.shortReceptions ?? 0,      mult: SCORING.shortReception },
      { key: 'mREC', label: 'Medium Gain',       count: line.mediumReceptions ?? 0,     mult: SCORING.mediumReception },
      { key: 'lREC', label: 'Long Gain',         count: line.longReceptions ?? 0,       mult: SCORING.longReception },
      { key: 'FLG',  label: 'Flag Grabs',        count: line.flagsPulled ?? 0,          mult: SCORING.flagGrab },
      { key: 'SACK', label: 'Sacks',             count: line.sacks ?? 0,                mult: SCORING.sack },
      { key: 'INT',  label: 'Interceptions',     count: line.interceptions ?? 0,        mult: SCORING.interception },
    ];
    const withTotals = items.map(i => ({ ...i, subtotal: i.count * i.mult }));
    const grandTotal = withTotals.reduce((s, i) => s + i.subtotal, 0);
    return { rows: withTotals, grandTotal };
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Box Score',
          headerStyle: { backgroundColor: NAVY },
          headerTintColor: YELLOW,
          headerTitleStyle: { color: YELLOW, fontWeight: 'bold', fontFamily: FONT_FAMILIES.archivoBlack },
        }}
      />

      {/* Score header (time/field + two teams + fantasy totals) */}
      <View style={styles.headerCard}>
        <Text style={styles.subhead}>
          {game.time} • {game.field}
        </Text>

        <View style={styles.teamRow}>
          {logo1 ? <Image source={logo1} style={styles.logo} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.teamName} numberOfLines={1}>{name1}</Text>
            {!!cap1Last && <Text style={styles.captain}>{cap1Last}</Text>}
          </View>
          <Text style={styles.score}>{derivedPoints(game, 'team1')}</Text>
        </View>

        <View style={styles.sepLine} />

        <View style={styles.teamRow}>
          {logo2 ? <Image source={logo2} style={styles.logo} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.teamName} numberOfLines={1}>{name2}</Text>
            {!!cap2Last && <Text style={styles.captain}>{cap2Last}</Text>}
          </View>
          <Text style={styles.score}>{derivedPoints(game, 'team2')}</Text>
        </View>
      </View>

      <Text style={styles.status}>{game.status}</Text>

      {/* Toggle which team box score to show */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          onPress={() => setSide('team1')}
          style={[styles.toggleBtn, side === 'team1' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, side === 'team1' && styles.toggleTextActive]} numberOfLines={1}>
            {name1}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSide('team2')}
          style={[styles.toggleBtn, side === 'team2' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, side === 'team2' && styles.toggleTextActive]} numberOfLines={1}>
            {name2}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Spreadsheet-like box: Player | TD | Full breakdown */}
      <View style={styles.tableCard}>

        <FlatList
          data={rows}
          keyExtractor={(r) => r.playerId}
          ItemSeparatorComponent={() => <View style={styles.rowSep} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={[styles.cell, styles.cName]} numberOfLines={1} ellipsizeMode="tail">
                {item.name}
              </Text>

              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => setDetail({ name: item.name, line: item.line })}
                activeOpacity={0.85}
              >
                <Text style={styles.detailBtnText}>Game Breakdown</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      {/* Modal: per-player full breakdown (matches player screen layout) */}
      <Modal
        visible={!!detail}
        transparent
        animationType="fade"
        onRequestClose={() => setDetail(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setDetail(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {detail && (() => {
              const { rows, grandTotal } = computeBreakdown(detail.line);
              return (
                <>
                  <Text style={styles.modalTitle}>{detail.name}'s Stats</Text>

                  <View style={[styles.row, styles.rowHead]}>
                    <Text style={[styles.cellLabel, { flex: 1 }]}>Metric</Text>
                    <Text style={[styles.cell, styles.right]}>Count</Text>
                    <Text style={[styles.cell, styles.right]}>Pts</Text>
                    <Text style={[styles.cell, styles.right]}>Total</Text>
                  </View>

                  <FlatList
                    data={rows}
                    keyExtractor={(r) => r.key}
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                    renderItem={({ item }) => (
                      <View style={styles.row}>
                        <Text style={[styles.cellLabel, { flex: 1 }]} numberOfLines={1}>{item.label}</Text>
                        <Text style={[styles.cell, styles.right]}>{item.count}</Text>
                        <Text style={[styles.cell, styles.right]}>{item.mult}</Text>
                        <Text style={[styles.cell, styles.right, styles.totalCell]}>{item.subtotal}</Text>
                      </View>
                    )}
                    ListFooterComponent={
                      <View style={[styles.row, styles.footerRow]}>
                        <Text style={[styles.cellLabel, { flex: 1 }]}>Total</Text>
                        <Text style={[styles.cell, styles.right]} />
                        <Text style={[styles.cell, styles.right]} />
                        <Text style={[styles.cell, styles.right]} />
                        <Text style={[styles.cell, styles.right, styles.totalCell]}>{grandTotal}</Text>
                      </View>
                    }
                  />

                  <TouchableOpacity style={styles.closeBtn} onPress={() => setDetail(null)}>
                    <Text style={styles.closeBtnText}>Close</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** styles **/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 12 },

  headerCard: { backgroundColor: CARD, borderRadius: 12, padding: 12, marginBottom: 12 },
  subhead: { color: TEXT, textAlign: 'left', marginBottom: 10, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoBlack },

  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  logo: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)'
  },
  teamName: { color: YELLOW, fontWeight: '800', fontSize: 16 },
  captain: { color: TEXT, fontSize: 12 },
  score: { color: YELLOW, fontWeight: '900', fontSize: 22, marginLeft: 8 },
  sepLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 8 },
  status: { color: YELLOW, fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 20, textAlign: 'right', fontFamily: FONT_FAMILIES.archivoBlack },

  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#062a4e', alignItems: 'center' },
  toggleActive: { backgroundColor: CARD },
  toggleText: { color: TEXT, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoBlack },
  toggleTextActive: { color: YELLOW, fontFamily: FONT_FAMILIES.archivoBlack },

  tableCard: { flex: 1, backgroundColor: CARD, borderRadius: 12, padding: 10 },
  headRow: { backgroundColor: '#0a3a68', borderRadius: 8, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a3a68', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  rowSep: { height: 8 },
  hCell: { color: YELLOW, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  cell: { color: TEXT, fontWeight: '800', width: 60, fontFamily: FONT_FAMILIES.archivoBlack },

  // column widths
  cName: { flex: 1.6, fontSize: 12, fontFamily: FONT_FAMILIES.archivoBlack },
  cNum:  { width: 64, textAlign: 'center' },
  cAction: { width: 132 },

  detailBtn: {
    backgroundColor: YELLOW,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack, fontSize: 12 },

  // Modal (matches player screen)
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '92%', maxHeight: '80%', backgroundColor: NAVY, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: LINE },
  modalTitle: { color: YELLOW, fontWeight: '900', fontSize: 18, marginBottom: 10, fontFamily: FONT_FAMILIES.archivoBlack, textAlign: 'center' },

  rowHead: { backgroundColor: '#0f4a85', marginBottom: 8 },
  footerRow: { marginTop: 10, backgroundColor: '#0f4a85', borderRadius: 8 },

  cellLabel: { color: YELLOW, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  right: { textAlign: 'right' as const },
  totalCell: { color: YELLOW },

  closeBtn: { alignSelf: 'center', marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: YELLOW },
  closeBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  empty: { color: YELLOW, textAlign: 'center' },
});
