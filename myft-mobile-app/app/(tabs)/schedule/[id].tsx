// app/(tabs)/schedule/[id].tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  findGameById,
  statsForRender,
  derivedPoints,
  type PlayerGameStat,
  type Game,
} from '../../data/scheduleData';
import { useTournament } from '../../../context/TournamentContext';
import { getTeamLogo } from '../../../assets/team_logos';

type Row = {
  playerId: string;
  name: string;
  td: number;
  int: number;
  flg: number;
  mvp: number;
};

const YELLOW = '#FFD700';
const NAVY   = '#001F3F';
const CARD   = '#07335f';
const CARD2  = '#0a3a68';
const MUTED  = '#BFD0E4';

export default function GameDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { teams } = useTournament();
  const [side, setSide] = useState<'team1' | 'team2'>('team1');

  const found = useMemo(() => findGameById(id), [id]);
  if (!found) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Stack.Screen
          options={{
            title: 'Box Score',
            headerStyle: { backgroundColor: NAVY },
            headerTintColor: YELLOW,
            headerTitleStyle: { color: YELLOW, fontWeight: 'bold' },
          }}
        />
        <Text style={styles.empty}>Game not found.</Text>
      </View>
    );
  }

  const { game, day } = found;

  // resolve teams, names, captains, logos
  const t1 = teams.find(t => t.id === game.team1);
  const t2 = teams.find(t => t.id === game.team2);

  const name1   = t1?.name ?? game.team1;
  const name2   = t2?.name ?? game.team2;
  const cap1Last = t1?.captain ? t1.captain.trim().split(/\s+/).slice(-1)[0] : '';
  const cap2Last = t2?.captain ? t2.captain.trim().split(/\s+/).slice(-1)[0] : '';
  const logo1   = getTeamLogo(game.team1);
  const logo2   = getTeamLogo(game.team2);

  // --- merge roster with this game's per-player lines (so all players show, even zeros)
  const merge = (teamId: string, which: 'team1' | 'team2'): Row[] => {
    const team = teams.find(t => t.id === teamId);
    const box = statsForRender(game);
    const lines: PlayerGameStat[] =
      which === 'team1' ? (box?.team1 ?? []) : (box?.team2 ?? []);

    const lineById = new Map(lines.map(l => [l.playerId, l]));
    return (team?.players ?? []).map(p => {
      const l = lineById.get(p.id);
      return {
        playerId: p.id,
        name: p.name,
        position: p.position,
        td:  l?.touchdowns    ?? 0,
        int: l?.interceptions ?? 0,
        flg: l?.flagsPulled   ?? 0,
        mvp: l?.mvpAwards     ?? 0,
      };
    });
  };

  const activeTeamId = side === 'team1' ? game.team1 : game.team2;
  const rows = merge(activeTeamId, side);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          // default back button will show the previous screen's title (e.g., "All Games")
          title: 'Box Score',
          headerStyle: { backgroundColor: NAVY },
          headerTintColor: YELLOW,
          headerTitleStyle: { color: YELLOW, fontWeight: 'bold' },
        }}
      />

      {/* score header */}
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

      {/* toggle which team box score to show */}
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

      {/* spreadsheet-like box */}
      <View style={styles.tableCard}>
        {/* header row */}
        <View style={[styles.row, styles.headRow]}>
          <Text style={[styles.hCell, styles.cName]}>Player</Text>
          <Text style={[styles.hCell, styles.cNum]}>TD</Text>
          <Text style={[styles.hCell, styles.cNum]}>INT</Text>
          <Text style={[styles.hCell, styles.cNum]}>FLG</Text>
          <Text style={[styles.hCell, styles.cNum]}>MVP</Text>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(r) => r.playerId}
          ItemSeparatorComponent={() => <View style={styles.rowSep} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {/* Wider name column so long names fit better */}
              <Text
                style={[styles.cell, styles.cName]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.name}
              </Text>
              <Text style={[styles.cell, styles.cNum]}>{item.td}</Text>
              <Text style={[styles.cell, styles.cNum]}>{item.int}</Text>
              <Text style={[styles.cell, styles.cNum]}>{item.flg}</Text>
              <Text style={[styles.cell, styles.cNum]}>{item.mvp}</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 12 },

  headerCard: { backgroundColor: CARD, borderRadius: 12, padding: 12, marginBottom: 12 },
  subhead: { color: MUTED, textAlign: 'left', marginBottom: 10, fontWeight: '700' },

  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  logo: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)'
  },
  teamName: { color: YELLOW, fontWeight: '800', fontSize: 16 },
  captain: { color: MUTED, fontSize: 12 },
  score: { color: YELLOW, fontWeight: '900', fontSize: 22, marginLeft: 8 },
  sepLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 8 },
  status: { color: YELLOW, fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 20, textAlign: 'right' },

  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#062a4e', alignItems: 'center' },
  toggleActive: { backgroundColor: '#0b3c70' },
  toggleText: { color: '#94abc3', fontWeight: '700' },
  toggleTextActive: { color: YELLOW },

  tableCard: { flex: 1, backgroundColor: CARD, borderRadius: 12, padding: 10 },
  headRow: { backgroundColor: CARD2, borderRadius: 8, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD2, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  rowSep: { height: 8 },
  hCell: { color: YELLOW, fontWeight: '800' },
  cell: { color: YELLOW, fontWeight: '700' },

  // column widths — make name wider so long names fit
  cName: { flex: 1.8 },
  cPos:  { width: 52, textAlign: 'center', color: MUTED, fontWeight: '800' },
  cNum:  { width: 54, textAlign: 'center' },

  empty: { color: YELLOW, textAlign: 'center' },
});
