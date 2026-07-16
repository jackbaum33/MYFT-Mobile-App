// schedule/BracketView.tsx - Swipeable playoff bracket (ESPN Tournament Challenge style)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import type { Team } from '../../../context/TournamentContext';
import { getTeamLogo } from '../../../team_logos';
import { FONT_FAMILIES } from '../../../fonts';
import type { UICardGame } from './index';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.12)';

type Props = {
  games: UICardGame[]; // this day's bucket only (all bracket games)
  teams: Team[];
  onPressGame: (id: string) => void;
};

type RoundMeta = { round: number; label: string };

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BracketView({ games, teams, onPressGame }: Props) {
  const divisions = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) if (g.division) set.add(g.division);
    // Stable, predictable order regardless of Firestore write order
    return ['boys', 'girls'].filter(d => set.has(d));
  }, [games]);

  const [selectedDivision, setSelectedDivision] = useState<string | undefined>(divisions[0]);
  const [roundIndex, setRoundIndex] = useState(0);
  const pagerRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!selectedDivision && divisions.length > 0) setSelectedDivision(divisions[0]);
  }, [divisions, selectedDivision]);

  const divisionGames = useMemo(
    () => games.filter(g => g.division === selectedDivision),
    [games, selectedDivision]
  );

  const rounds: RoundMeta[] = useMemo(() => {
    const byRound = new Map<number, string>();
    for (const g of divisionGames) {
      if (g.round === undefined) continue;
      if (!byRound.has(g.round)) byRound.set(g.round, g.roundLabel ?? `Round ${g.round + 1}`);
    }
    return Array.from(byRound.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, label]) => ({ round, label }));
  }, [divisionGames]);

  const gamesByRound = useMemo(() => {
    const m = new Map<number, UICardGame[]>();
    for (const r of rounds) {
      m.set(
        r.round,
        divisionGames
          .filter(g => g.round === r.round)
          .sort((a, b) => (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0))
      );
    }
    return m;
  }, [divisionGames, rounds]);

  const jumpToRound = (idx: number) => {
    setRoundIndex(idx);
    pagerRef.current?.scrollTo({ x: idx * SCREEN_WIDTH, animated: true });
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setRoundIndex(idx);
  };

  if (!selectedDivision || rounds.length === 0) {
    return (
      <View style={s.emptyWrap}>
        <Text style={s.emptyText}>Bracket not available yet.</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {divisions.length > 1 && (
        <View style={s.segWrap}>
          {divisions.map(d => (
            <Pressable
              key={d}
              onPress={() => {
                setSelectedDivision(d);
                setRoundIndex(0);
                pagerRef.current?.scrollTo({ x: 0, animated: false });
              }}
              style={[s.segBtn, selectedDivision === d && s.segBtnActive]}
            >
              <Text style={[s.segText, selectedDivision === d && s.segTextActive]}>
                {d === 'boys' ? 'Boys' : 'Girls'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={s.tabs}>
        {rounds.map((r, i) => (
          <Pressable key={r.round} onPress={() => jumpToRound(i)} style={[s.tab, roundIndex === i && s.tabActive]}>
            <Text style={[s.tabText, roundIndex === i && s.tabTextActive]}>{r.label}</Text>
            {roundIndex === i && <View style={s.underline} />}
          </Pressable>
        ))}
      </View>

      <ScrollView
        key={selectedDivision}
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
      >
        {rounds.map(r => (
          <View key={r.round} style={{ width: SCREEN_WIDTH }}>
            <FlatList
              data={gamesByRound.get(r.round) ?? []}
              keyExtractor={g => g.id}
              contentContainerStyle={s.roundList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => <BracketCard item={item} teams={teams} onPressGame={onPressGame} />}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function BracketCard({
  item,
  teams,
  onPressGame,
}: {
  item: UICardGame;
  teams: Team[];
  onPressGame: (id: string) => void;
}) {
  const hasBothTeams = !!item.team1 && !!item.team2;
  const pressable = hasBothTeams && !item.isBye;
  const showScore = item.status.toLowerCase() === 'live' || item.status.toLowerCase() === 'final';

  const statusColor =
    item.status.toLowerCase() === 'live' ? '#4CAF50' : item.status.toLowerCase() === 'final' ? '#9E9E9E' : YELLOW;

  const Wrapper = pressable ? Pressable : View;

  return (
    <Wrapper
      style={[s.card, !pressable && s.cardDisabled]}
      {...(pressable ? { onPress: () => onPressGame(item.id) } : {})}
    >
      <Text style={[s.status, { color: statusColor }]}>
        {item.isBye ? 'BYE' : item.status}
      </Text>

      <TeamRow
        seed={item.seed1}
        teamId={item.team1}
        teams={teams}
        score={item.score1}
        showScore={showScore}
      />

      {item.isBye ? (
        <View style={s.byeRow}>
          <Text style={s.byeText}>— no opponent —</Text>
        </View>
      ) : (
        <TeamRow
          seed={item.seed2}
          teamId={item.team2}
          teams={teams}
          score={item.score2}
          showScore={showScore}
        />
      )}

      {(item.time || item.field) && !item.isBye && (
        <Text style={s.meta}>{item.time || 'TBD'}{item.field ? ` • ${item.field}` : ''}</Text>
      )}
    </Wrapper>
  );
}

function TeamRow({
  seed,
  teamId,
  teams,
  score,
  showScore,
}: {
  seed?: number;
  teamId: string;
  teams: Team[];
  score: number;
  showScore: boolean;
}) {
  if (!teamId) {
    return (
      <View style={s.teamRow}>
        <View style={s.logoContainer} />
        <Text style={s.tbdText}>TBD</Text>
      </View>
    );
  }

  const team = teams.find(t => t.id.toLowerCase() === teamId.toLowerCase());
  const logo = getTeamLogo(teamId);

  return (
    <View style={s.teamRow}>
      {seed != null && (
        <View style={s.seedBadge}>
          <Text style={s.seedText}>{seed}</Text>
        </View>
      )}
      <View style={s.logoContainer}>
        {logo ? <Image source={logo} style={s.logo} resizeMode="contain" /> : null}
      </View>
      <Text style={s.teamName} numberOfLines={1}>
        {team?.name ?? teamId}
      </Text>
      {showScore && <Text style={s.score}>{score}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: TEXT, opacity: 0.8, textAlign: 'center' },

  segWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#07335f',
    borderRadius: 10,
    padding: 6,
    gap: 8,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  segBtn: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  segBtnActive: { backgroundColor: YELLOW },
  segText: { color: YELLOW, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoBlack },
  segTextActive: { color: NAVY, fontFamily: FONT_FAMILIES.archivoBlack },

  tabs: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, marginBottom: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  tabActive: { backgroundColor: NAVY },
  tabText: { color: '#FFFFFF', fontWeight: '700', letterSpacing: 1, fontFamily: FONT_FAMILIES.archivoBlack, fontSize: 12 },
  tabTextActive: { color: '#FFFFFF', fontFamily: FONT_FAMILIES.archivoBlack },
  underline: { height: 3, backgroundColor: YELLOW, borderRadius: 2, marginTop: 6 },

  roundList: { paddingHorizontal: 10, paddingBottom: 24, gap: 10 },

  card: {
    backgroundColor: CARD,
    borderRadius: 10,
    padding: 10,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  cardDisabled: { opacity: 0.6 },
  status: { color: YELLOW, fontWeight: '700', fontSize: 12, fontFamily: FONT_FAMILIES.archivoBlack, marginBottom: 4 },

  teamRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  seedBadge: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  seedText: { color: TEXT, fontSize: 10, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },

  logoContainer: {
    width: 28,
    height: 28,
    marginRight: 8,
    borderRadius: 6,
    backgroundColor: '#00417D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 30, height: 30 },

  teamName: { flex: 1, color: '#FFFFFF', fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack, fontSize: 13 },
  tbdText: { flex: 1, color: TEXT, opacity: 0.5, fontStyle: 'italic', fontFamily: FONT_FAMILIES.archivoNarrow },
  score: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, marginLeft: 8 },

  byeRow: { paddingVertical: 4 },
  byeText: { color: TEXT, opacity: 0.5, fontSize: 11, fontFamily: FONT_FAMILIES.archivoNarrow },

  meta: { color: '#FFFFFF', fontSize: 12, marginTop: 6, opacity: 0.8, fontFamily: FONT_FAMILIES.archivoNarrow },
  line: { height: 1, backgroundColor: LINE },
});
