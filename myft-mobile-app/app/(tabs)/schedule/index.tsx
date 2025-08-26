import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { scheduleData, type Game, type PlayerGameStat, derivedPoints } from '../../data/scheduleData';
import { useTournament } from '../../../context/TournamentContext';
import { getTeamLogo } from '../../../assets/team_logos';
import { FONT_FAMILIES } from '@/assets/fonts';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';


export default function ScheduleIndex() {
  const router = useRouter();
  const { teams } = useTournament();
  const [dayIndex, setDayIndex] = useState(0);

  const day = scheduleData[dayIndex];
  const games = day?.games ?? [];

  const teamById = (id?: string) =>
    teams.find(t => t.id.toLowerCase() === (id ?? '').toLowerCase());

  const captainLast = (full?: string) => {
    if (!full) return '';
    const parts = full.trim().split(/\s+/);
    return parts[parts.length - 1] || full;
  };

  const GameCard = ({ item }: { item: Game }) => {
    const score1 = derivedPoints(item, 'team1');
    const score2 = derivedPoints(item, 'team2');
    const t1 = teamById(item.team1);
    const t2 = teamById(item.team2);
    const logo1 = getTeamLogo(item.team1);
    const logo2 = getTeamLogo(item.team2);

    return (
      <Pressable
        onPress={() => router.push({ pathname: '/(tabs)/schedule/[id]', params: { id: item.id } })}
        style={s.card}
      >
        <View style={s.headerRow}>
          <Text style={s.status}>{item.status}</Text>
        </View>

        <View style={s.row}>
          {logo1 ? <Image source={logo1} style={s.logo} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={s.teamName} numberOfLines={1}>{t1?.name ?? item.team1}</Text>
            {!!t1?.captain && <Text style={s.captain}>{captainLast(t1.captain)}</Text>}
          </View>
          <Text style={s.score}>{score1}</Text>
        </View>

        <View style={s.row}>
          {logo2 ? <Image source={logo2} style={s.logo} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={s.teamName} numberOfLines={1}>{t2?.name ?? item.team2}</Text>
            {!!t2?.captain && <Text style={s.captain}>{captainLast(t2.captain)}</Text>}
          </View>
          <Text style={s.score}>{score2}</Text>
        </View>

        <Text style={s.meta}>{item.time} • {item.field}</Text>
      </Pressable>
    );
  };

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: 'All Games',
          headerStyle: { backgroundColor: NAVY },
          headerTintColor: YELLOW,
          headerTitleStyle: { color: YELLOW, fontWeight: 'bold' },
        }}
      />

      {/* Day tabs */}
      <View style={s.tabs}>
        {scheduleData.map((d, i) => (
          <Pressable
            key={d.label}
            onPress={() => setDayIndex(i)}
            style={[s.tab, dayIndex === i && s.tabActive]}
          >
            <Text style={[s.tabText, dayIndex === i && s.tabTextActive]}>{d.label}</Text>
            {dayIndex === i && <View style={s.underline} />}
          </Pressable>
        ))}
      </View>

      {/* Scrollable grid of games */}
      <FlatList
        data={games}
        keyExtractor={(g) => g.id}
        renderItem={GameCard}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, paddingTop: 8 },
  tabs: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, marginBottom: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  tabActive: { backgroundColor: NAVY },
  tabText: { color: TEXT, fontWeight: '700', letterSpacing: 1, fontFamily: FONT_FAMILIES.archivoBlack},
  tabTextActive: { color: TEXT, fontFamily: FONT_FAMILIES.archivoBlack },
  underline: { height: 3, backgroundColor: YELLOW, borderRadius: 2, marginTop: 6 },

  card: {
    backgroundColor: CARD,
    borderRadius: 10,
    padding: 10,
    flex: 1,
    marginBottom: 10,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  status: { color: YELLOW, fontWeight: '700', fontSize: 12, fontFamily: FONT_FAMILIES.archivoBlack },

  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  logo: { width: 22, height: 22, marginRight: 8, borderRadius: 4, backgroundColor: '#0b1520' },
  teamName: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  captain: { color: '#cfe0f2', fontSize: 11, fontFamily: FONT_FAMILIES.archivoNarrow },
  score: { color: TEXT, fontWeight: '900', fontSize: 18, marginLeft: 8 },
  meta: { color: TEXT, fontSize: 15, marginTop: 6, textAlign: 'left', fontFamily: FONT_FAMILIES.archivoNarrow},
});
