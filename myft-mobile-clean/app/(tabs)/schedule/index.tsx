// schedule/index.tsx - React Navigation Version with Auto-Refresh Support
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { useTournament } from '../../../context/TournamentContext';
import { getTeamLogo } from '../../../team_logos';
import { FONT_FAMILIES } from '../../../fonts';

// Import the navigation types from your layout
import { ScheduleStackParamList } from './_layout';

type ScheduleNavigationProp = NavigationProp<ScheduleStackParamList, 'ScheduleIndex'>;

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';

type FSGame = {
  startTime: Timestamp;                // Firestore Timestamp
  field?: string;                      // e.g., "Field A"
  division?: 'boys' | 'girls' | string;
  team1ID?: string;                    // team ids
  team2ID?: string;
  team1score?: number;
  team2score?: number;
  status?: 'scheduled' | 'live' | 'final' | string;
};

type UICardGame = {
  id: string;
  time: string;       // e.g. "3:30 PM"
  field: string;
  team1: string;      // team id (for logo + lookup)
  team2: string;
  status: string;
  score1: number;
  score2: number;
  dayKey: string;     // YYYY-MM-DD
};

type DayBucket = { label: string; games: UICardGame[] };

function fmtTime(ts?: Timestamp) {
  if (!ts) return '';
  const d = ts.toDate();
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function dateKey(ts?: Timestamp) {
  if (!ts) return 'Unknown';
  const d = ts.toDate();
  // Make a stable YYYY-MM-DD key based on local date
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function prettyDayLabel(key: string) {
  // key: YYYY-MM-DD -> "Fri • Nov 8"
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  if (isNaN(dt.getTime())) return key;
  return dt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ScheduleIndex() {
  const navigation = useNavigation<ScheduleNavigationProp>();
  const { teams, refreshTrigger } = useTournament(); // Get refreshTrigger from context

  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayBucket[]>([]);
  const [dayIndex, setDayIndex] = useState(0);

  // Load games from Firestore and group by day
  // UPDATED: Now responds to refreshTrigger from context
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const qGames = query(collection(db, 'games'), orderBy('startTime', 'asc'));
        const snap = await getDocs(qGames);

        const rows: UICardGame[] = snap.docs.map(d => {
          const g = (d.data() || {}) as FSGame;
          const key = dateKey(g.startTime);
          return {
            id: d.id,
            time: fmtTime(g.startTime),
            field: g.field ?? '',
            team1: g.team1ID ?? '',
            team2: g.team2ID ?? '',
            status: g.status ?? 'scheduled',
            score1: Number(g.team1score ?? 0),
            score2: Number(g.team2score ?? 0),
            dayKey: key,
          };
        });

        // Group by dayKey
        const byDay = new Map<string, UICardGame[]>();
        for (const r of rows) {
          const list = byDay.get(r.dayKey) ?? [];
          list.push(r);
          byDay.set(r.dayKey, list);
        }

        const built: DayBucket[] = Array.from(byDay.entries())
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, list]) => ({
            label: prettyDayLabel(key),
            games: list,
          }));

        if (active) {
          setDays(built);
          // Preserve the current day index if possible
          setDayIndex(prev => (prev < built.length ? prev : 0));
        }
      } catch (e) {
        console.warn('[schedule] failed to load games:', e);
        if (active) setDays([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [refreshTrigger]); // Added refreshTrigger as dependency

  const day = days[dayIndex];
  const games = day?.games ?? [];

  const teamById = (id?: string) =>
    teams.find(t => t.id.toLowerCase() === (id ?? '').toLowerCase());

  const captainLast = (full?: string) => {
    if (!full) return '';
    const parts = full.trim().split(/\s+/);
    return parts[parts.length - 1] || full;
  };

  // Navigation handler
  const navigateToGame = (gameId: string) => {
    navigation.navigate('ScheduleDetail', { id: gameId });
  };

  const GameCard = ({ item }: { item: UICardGame }) => {
    const t1 = teamById(item.team1);
    const t2 = teamById(item.team2);
    const logo1Name = item.team1.split('-')[0];
    const logo2Name = item.team2.split('-')[0];
    const logo1 = getTeamLogo(logo1Name);
    const logo2 = getTeamLogo(logo2Name);

    return (
      <Pressable
        onPress={() => navigateToGame(item.id)}
        style={s.card}
      >
        <View style={s.headerRow}>
          <Text style={s.status}>{item.status}</Text>
        </View>

        <View style={s.row}>
          <View style={s.logoContainer}>
            {logo1 ? <Image source={logo1} style={s.logo} resizeMode="contain" /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.teamName} numberOfLines={1}>{t1?.name ?? item.team1}</Text>
            {!!t1?.captain && <Text style={s.captain}>{captainLast(t1.captain)}</Text>}
          </View>
          <Text style={s.score}>{item.score1}</Text>
        </View>

        <View style={s.row}>
          <View style={s.logoContainer}>
            {logo2 ? <Image source={logo2} style={s.logo} resizeMode="contain" /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.teamName} numberOfLines={1}>{t2?.name ?? item.team2}</Text>
            {!!t2?.captain && <Text style={s.captain}>{captainLast(t2.captain)}</Text>}
          </View>
          <Text style={s.score}>{item.score2}</Text>
        </View>

        <Text style={s.meta}>
          {item.time || 'TBD'} • {item.field || 'Court TBD'}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={s.container}>
      {/* Day tabs */}
      <View style={s.tabs}>
        {days.length === 0 ? (
          <Text style={{ color: TEXT, opacity: 0.8 }}>No games yet</Text>
        ) : (
          days.map((d, i) => (
            <Pressable
              key={`${d.label}-${i}`}
              onPress={() => setDayIndex(i)}
              style={[s.tab, dayIndex === i && s.tabActive]}
            >
              <Text style={[s.tabText, dayIndex === i && s.tabTextActive]}>{d.label}</Text>
              {dayIndex === i && <View style={s.underline} />}
            </Pressable>
          ))
        )}
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
        ListEmptyComponent={
          <View style={{ padding: 24 }}>
            <Text style={{ color: TEXT, textAlign: 'center' }}>
              {loading ? 'Loading…' : 'No games found.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, paddingTop: 8 },
  tabs: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, marginBottom: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  tabActive: { backgroundColor: NAVY },
  tabText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 1, fontFamily: FONT_FAMILIES.archivoBlack },
  tabTextActive: { color: '#FFFFFF', fontFamily: FONT_FAMILIES.archivoBlack },
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

  logoContainer: {
    width: 32,
    height: 32,
    marginRight: 8,
    borderRadius: 6,
    backgroundColor: '#00417D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 35, height: 35 },

  teamName: { color: '#FFFFFF', fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  captain: { color: '#FFFFFF', fontSize: 11, fontFamily: FONT_FAMILIES.archivoNarrow },
  score: { color: '#FFFFFF', fontWeight: '900', fontSize: 18, marginLeft: 8 },
  meta: { color: '#FFFFFF', fontSize: 15, marginTop: 6, textAlign: 'left', fontFamily: FONT_FAMILIES.archivoNarrow },
});