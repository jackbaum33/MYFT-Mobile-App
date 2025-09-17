// schedule/[id].tsx - React Navigation Version
import React, { useEffect, useMemo, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Modal, Pressable } from 'react-native';
import { RouteProp, useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { FONT_FAMILIES } from '../../../fonts';
import { useTournament, SCORING } from '../../../context/TournamentContext';
import { getTeamLogo } from '../../../team_logos';

// Import the navigation types from your layout
import { ScheduleStackParamList } from './_layout';

type ScheduleDetailRouteProp = RouteProp<ScheduleStackParamList, 'ScheduleDetail'>;
type ScheduleDetailNavigationProp = NavigationProp<ScheduleStackParamList, 'ScheduleDetail'>;

type FSGame = {
  division?: 'boys' | 'girls' | string;
  field?: string;
  startTime?: any; // Firestore Timestamp
  status?: 'scheduled' | 'live' | 'final' | string;
  team1ID?: string;
  team2ID?: string;
  team1score?: number;
  team2score?: number;
};

const CARD = '#00417D';
const NAVY = '#00274C';
const TEXT = '#E9ECEF';
const YELLOW = '#FFCB05';
const LINE = 'rgba(255,255,255,0.18)';

export default function GameDetail() {
  const route = useRoute<ScheduleDetailRouteProp>();
  const navigation = useNavigation<ScheduleDetailNavigationProp>();
  const { id } = route.params;
  
  const { teams, calculatePoints } = useTournament();

  const [game, setGame] = useState<FSGame | null>(null);
  const [loading, setLoading] = useState(true);

  const [side, setSide] = useState<'team1' | 'team2'>('team1');
  const [detail, setDetail] = useState<{
    name: string;
    line: {
      touchdowns: number;
      passingTDs: number;
      minimalReceptions: number;
      shortReceptions: number;
      mediumReceptions: number;
      longReceptions: number;
      catches: number;
      flagsPulled: number;
      sacks: number;
      interceptions: number;
      passingInterceptions: number;
    };
  } | null>(null);

  // Set header title
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Box Score',
    });
  }, [navigation]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        if (!id) {
          if (active) { setGame(null); }
          return;
        }
        const snap = await getDoc(doc(db, 'games', String(id)));
        if (active) setGame(snap.exists() ? (snap.data() as FSGame) : null);
      } catch (e) {
        console.warn('[game detail] load failed:', e);
        if (active) setGame(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  const timeStr = useMemo(() => {
    const ts = game?.startTime;
    if (!ts?.toDate) return '';
    const d = ts.toDate() as Date;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }, [game]);

  const t1 = useMemo(
    () => (game?.team1ID ? teams.find(t => t.id === game.team1ID) : undefined),
    [teams, game?.team1ID]
  );
  const t2 = useMemo(
    () => (game?.team2ID ? teams.find(t => t.id === game.team2ID) : undefined),
    [teams, game?.team2ID]
  );

  const name1 = t1?.name ?? (game?.team1ID ?? '');
  const name2 = t2?.name ?? (game?.team2ID ?? '');
  const s = game?.status ?? '';
  const prettyStatus = s ? s[0].toUpperCase() + s.slice(1) : '';
  const cap1Last = t1?.captain ? t1.captain.trim() : '';
  const cap2Last = t2?.captain ? t2.captain.trim() : '';
  const nameforLogo1 = game?.team1ID?.split('-')[0];
  const nameforLogo2 = game?.team2ID?.split('-')[0];
  const logo1 = getTeamLogo(nameforLogo1);
  const logo2 = getTeamLogo(nameforLogo2);

  const rows = useMemo(() => {
    const team = side === 'team1' ? t1 : t2;
    const list = (team?.players ?? []).map(p => ({
      playerId: p.id,
      name: p.name,
      td: p.stats.touchdowns ?? 0,
      line: { ...p.stats },
    }));
    return list;
  }, [side, t1, t2]);

  const computeBreakdown = (line: NonNullable<typeof detail>['line']) => {
    const items = [
      { key: 'TD',   label: 'Touchdowns',        count: line.touchdowns ?? 0,           mult: SCORING.touchdown },
      { key: 'pTD',  label: 'Passing TDs',       count: line.passingTDs ?? 0,           mult: SCORING.passingTD },
      { key: 'minR', label: 'Minimal Gain',      count: line.minimalReceptions ?? 0,    mult: SCORING.minimalReception },
      { key: 'sREC', label: 'Short Gain',        count: line.shortReceptions ?? 0,      mult: SCORING.shortReception },
      { key: 'mREC', label: 'Medium Gain',       count: line.mediumReceptions ?? 0,     mult: SCORING.mediumReception },
      { key: 'lREC', label: 'Long Gain',         count: line.longReceptions ?? 0,       mult: SCORING.longReception },
      { key: 'C',    label: 'Catches',           count: line.catches ?? 0,              mult: SCORING.catch },
      { key: 'FLG',  label: 'Flag Grabs',        count: line.flagsPulled ?? 0,          mult: SCORING.flagGrab },
      { key: 'SACK', label: 'Sacks',             count: line.sacks ?? 0,                mult: SCORING.sack },
      { key: 'INT',  label: 'Interceptions',     count: line.interceptions ?? 0,        mult: SCORING.interception },
      { key: 'pINT', label: 'Passing INTs',      count: line.passingInterceptions ?? 0, mult: SCORING.passingInterception },
    ];
    const withTotals = items.map(i => ({ ...i, subtotal: i.count * i.mult }));
    const grandTotal = withTotals.reduce((s, i) => s + i.subtotal, 0);
    return { rows: withTotals, grandTotal };
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={styles.empty}>Loading…</Text>
      </View>
    );
  }

  if (!game) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={styles.empty}>Game not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Score header */}
      <View style={styles.headerCard}>
        <Text style={styles.subhead}>
          {timeStr} • {game.field ?? ''}
        </Text>

        <View style={styles.teamRow}>
          <View style={styles.logoContainer}>
            {logo1 ? <Image source={logo1} style={styles.logo} resizeMode="contain" /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.teamName} numberOfLines={1}>{name1}</Text>
            {!!cap1Last && <Text style={styles.captain}>Captain: {cap1Last}</Text>}
          </View>
          <Text style={styles.score}>{Number(game.team1score ?? 0)}</Text>
        </View>

        <View style={styles.sepLine} />

        <View style={styles.teamRow}>
          <View style={styles.logoContainer}>
            {logo2 ? <Image source={logo2} style={styles.logo} resizeMode="contain" /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.teamName} numberOfLines={1}>{name2}</Text>
            {!!cap2Last && <Text style={styles.captain}>Captain: {cap2Last}</Text>}
          </View>
          <Text style={styles.score}>{Number(game.team2score ?? 0)}</Text>
        </View>
      </View>

      <Text style={styles.status}>{prettyStatus}</Text>

      {/* Toggle which team roster (season totals) to show */}
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

      {/* Spreadsheet-like box */}
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
                <Text style={styles.detailBtnText}>Total Stat Breakdown</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      {/* Modal: per-player full breakdown (uses SEASON totals) */}
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

/** styles (unchanged from original) **/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 12 },

  headerCard: { backgroundColor: CARD, borderRadius: 12, padding: 12, marginBottom: 12 },
  subhead: { color: TEXT, textAlign: 'left', marginBottom: 10, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoBlack },

  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },

  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#00417D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 35, height: 35 },

  teamName: { color: YELLOW, fontWeight: '800', fontSize: 16 },
  captain: { color: '#FFFFFF', fontSize: 12, fontFamily: FONT_FAMILIES.archivoBlack},
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

  backdrop: { flex: 1, backgroundColor: '#00417D', justifyContent: 'center', alignItems: 'center' },
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