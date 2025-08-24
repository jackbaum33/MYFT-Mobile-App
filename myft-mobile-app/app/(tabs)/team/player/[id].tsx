// app/(tabs)/leaderboard/player/[id].tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTournament } from '../../../../context/TournamentContext';
import { scheduleData, statsForRender } from '../../../data/scheduleData';
import { getTeamLogo } from '../../../../assets/team_logos';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const MUTED = '#A5B4C3';

type Line = {
  key: string;
  day: string;
  vs: string;
  td: number;
  int: number;
  flg: number;
  mvp: number;
};

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teams, calculatePoints } = useTournament(); // 👈 now pulling calculatePoints

  const player = useMemo(() => {
    for (const t of teams) {
      const p = t.players.find(pl => pl.id === id);
      if (p) return { player: p, teamName: t.name, teamId: t.id };
    }
    return null;
  }, [teams, id]);

  const fantasyPoints = useMemo(() => {
    if (!player) return 0;
    return calculatePoints(player.player);
  }, [player, calculatePoints]);

  const lines: Line[] = useMemo(() => {
    if (!id) return [];
    const out: Line[] = [];
    for (const day of scheduleData) {
      for (const g of day.games) {
        const box = statsForRender(g);
        if (!box) continue;
        const from1 = box.team1.find(l => l.playerId === id);
        if (from1) {
          out.push({
            key: `${g.id}-t1`,
            day: day.label,
            vs: g.team2.charAt(0).toUpperCase() + g.team2.slice(1),
            td: from1.touchdowns, int: from1.interceptions, flg: from1.flagsPulled, mvp: from1.mvpAwards,
          });
        }
        const from2 = box.team2.find(l => l.playerId === id);
        if (from2) {
          out.push({
            key: `${g.id}-t2`,
            day: day.label,
            vs: g.team1.charAt(0).toUpperCase() + g.team1.slice(1),
            td: from2.touchdowns, int: from2.interceptions, flg: from2.flagsPulled, mvp: from2.mvpAwards,
          });
        }
      }
    }
    return out;
  }, [id]);

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, r) => {
        acc.td += r.td; acc.int += r.int; acc.flg += r.flg; acc.mvp += r.mvp;
        return acc;
      },
      { td: 0, int: 0, flg: 0, mvp: 0 }
    );
  }, [lines]);

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

  return (
    <View style={{ flex: 1, backgroundColor: NAVY }}>
      <Stack.Screen options={{ title: `${p.name}` }} />

      <View style={s.container}>
        {/* Header / totals */}
        <View style={s.headerCard}>
          <View>
            <Text style={s.name}>{p.name}</Text>
            <Text style={s.meta}>{p.position}</Text>
          </View>
          <Image source={logoSrc} style={s.logo} resizeMode="contain" />
        </View>

        <Text style={s.statsTitle}>Total Stats</Text>
        <View style={s.headerCard}>
          <View style={s.totalsRow}>
            <StatBlock label="TD"  value={totals.td} />
            <StatBlock label="INT" value={totals.int} />
            <StatBlock label="FLG" value={totals.flg} />
            <StatBlock label="MVP" value={totals.mvp} />
          </View>
        </View>

        {/* Box score by game */}
        <Text style={s.gameBreakdownTitle}>Game Breakdown</Text>
        <View style={s.tableCard}>
          <View style={[s.row, s.headRow]}>
            <Text style={[s.hCell, s.cVs]}>Vs</Text>
            <Text style={[s.hCell, s.cNum]}>TD</Text>
            <Text style={[s.hCell, s.cNum]}>INT</Text>
            <Text style={[s.hCell, s.cNum]}>FLG</Text>
            <Text style={[s.hCell, s.cNum]}>MVP</Text>
          </View>
          <FlatList
            data={lines}
            keyExtractor={(r) => r.key}
            ItemSeparatorComponent={() => <View style={s.rowSep} />}
            renderItem={({ item }) => (
              <View style={s.row}>
                <Text style={[s.cell, s.cVs]} numberOfLines={1}>{item.vs}</Text>
                <Text style={[s.cell, s.cNum]}>{item.td}</Text>
                <Text style={[s.cell, s.cNum]}>{item.int}</Text>
                <Text style={[s.cell, s.cNum]}>{item.flg}</Text>
                <Text style={[s.cell, s.cNum]}>{item.mvp}</Text>
              </View>
            )}
          />
        </View>
      </View>

      {/* Bottom card for fantasy points */}
      <View style={s.bottomCard}>
        <Text style={s.bottomText}>Total Points: {fantasyPoints}</Text>
      </View>
    </View>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.statBlock}>
      <Text style={s.statVal}>{value}</Text>
      <Text style={s.statLbl}>{label}</Text>
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
  name: { color: YELLOW, fontWeight: '900', fontSize: 20 },
  statsTitle: { color: YELLOW, fontWeight: '900', fontSize: 20, marginBottom: 10, marginLeft: 5 },
  gameBreakdownTitle: { color: YELLOW, fontWeight: '900', fontSize: 20, marginBottom: 10, marginLeft: 5 },
  meta: { color: MUTED, marginTop: 4 },
  totalsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  statBlock: {
    backgroundColor: '#0a3a68',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    flex: 1,
  },
  statVal: { color: YELLOW, fontWeight: '900', fontSize: 18 },
  statLbl: { color: TEXT, fontWeight: '700', marginTop: 2 },
  tableCard: { flex: 1, backgroundColor: CARD, borderRadius: 12, padding: 10 },
  headRow: { backgroundColor: '#0a3a68', borderRadius: 8, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a3a68',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rowSep: { height: 8 },
  hCell: { color: YELLOW, fontWeight: '800' },
  cell: { color: YELLOW, fontWeight: '700' },
  cVs: { flex: 1 },
  cNum: { width: 52, textAlign: 'center' },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  // Bottom fantasy points card
  bottomCard: {
    backgroundColor: CARD,
    padding: 14,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 10, // 👈 adds space on left/right
    borderRadius: 12,     // 👈 rounded look
    marginBottom: 12,     // space from bottom of screen
  },
  bottomText: { color: YELLOW, fontWeight: '900', fontSize: 18, textAlign: 'center' },
});
