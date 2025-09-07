import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTournament } from '../../../../context/TournamentContext';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.14)';

type Division = 'boys' | 'girls';

export default function FantasyPlayerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { teams, userRoster, updateRoster, calculatePoints } = useTournament();

  const info = useMemo(() => {
    for (const t of teams) {
      const p = t.players.find(pl => pl.id === id);
      if (p) {
        const anyT = t as any;
        const raw = (anyT.division ?? anyT.gender ?? anyT.category ?? anyT.type ?? '')
          .toString().toLowerCase().trim();
        let div: Division | '' = '';
        if (raw.startsWith('men') || raw === 'boys' || raw === 'boy') div = 'boys';
        else if (raw.startsWith('women') || raw === 'girls' || raw === 'girl') div = 'girls';
        return {
          player: p,
          teamName: t.name,
          division: div as Division | '',
          fantasy: calculatePoints(p),
        };
      }
    }
    return null;
  }, [id, teams, calculatePoints]);

  if (!info) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: 'Player' }} />
        <Text style={{ color: TEXT }}>Player not found.</Text>
      </View>
    );
  }

  const { player, teamName, division, fantasy } = info;

  const boysCount = (userRoster?.boys ?? []).length;
  const girlsCount = (userRoster?.girls ?? []).length;
  const alreadyOnTeam =
    (userRoster?.boys ?? []).includes(player.id) || (userRoster?.girls ?? []).includes(player.id);

  const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const tryAdd = () => {
    if (!division) {
      Alert.alert('Division unknown', 'Cannot add this player (missing division).');
      return;
    }
    if (alreadyOnTeam) {
      Alert.alert('Already added', `${player.name} is already on your team.`);
      return;
    }
    if (division === 'boys' && boysCount >= 5) {
      Alert.alert('Boys full', 'You already have 5 Boys on your team.');
      return;
    }
    if (division === 'girls' && girlsCount >= 5) {
      Alert.alert('Girls full', 'You already have 5 Girls on your team.');
      return;
    }
    Alert.alert(
      'Add to team',
      `Add ${player.name} (${titleCase(division)}) to your team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          style: 'default',
          onPress: () => {
            updateRoster(division, player.id); // assuming toggles/adds in your context
            router.back();
          }
        }
      ]
    );
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'Player' }} />

      <View style={s.card}>
        <Text style={s.name}>{player.name}</Text>
        <Text style={s.sub}>{teamName ? ` • ${teamName}` : ''}{division ? ` • ${titleCase(division)}` : ''}</Text>
        <Text style={s.points}>Fantasy: {fantasy} pts</Text>

        <TouchableOpacity
          style={[s.addBtn, alreadyOnTeam && s.addBtnDisabled]}
          onPress={tryAdd}
          disabled={alreadyOnTeam}
        >
          <Text style={[s.addText, alreadyOnTeam && s.addTextDisabled]}>
            {alreadyOnTeam ? 'Already on Team' : 'Add to Team'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 12 },
  card: {
    marginTop: 20,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: LINE,
  },
  name: { color: TEXT, fontWeight: '900', fontSize: 20 },
  sub: { color: '#A5B4C3', marginTop: 6 },
  points: { color: YELLOW, fontWeight: '900', marginTop: 10 },

  addBtn: {
    marginTop: 16,
    backgroundColor: YELLOW,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
  },
  addBtnDisabled: { backgroundColor: '#6B7280', borderColor: 'transparent' },
  addText: { color: NAVY, fontWeight: '900' },
  addTextDisabled: { color: '#0b1222' },
});
