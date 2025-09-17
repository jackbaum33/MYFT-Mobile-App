// screens/TeamScreen.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTournament } from '../../TournamentContext';
import { getTeamLogo } from '../../team_logos';  // ← import helper
import { FONT_FAMILIES } from '../../fonts';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';

export default function TeamScreen() {
  const router = useRouter();
  const { teams } = useTournament();
  const [division, setDivision] = useState<'boys' | 'girls'>('boys');

  const filteredTeams = useMemo(
    () => teams.filter(t => t.division === division),
    [teams, division]
  );

  return (
    <View style={styles.container}>

      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, division === 'boys' && styles.toggleActive]}
          onPress={() => setDivision('boys')}
        >
          <Text style={[styles.toggleText, division === 'boys' && styles.toggleTextActive]}>Boys</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, division === 'girls' && styles.toggleActive]}
          onPress={() => setDivision('girls')}
        >
          <Text style={[styles.toggleText, division === 'girls' && styles.toggleTextActive]}>Girls</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTeams}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => {
          const nameForLogo = item.id.split('-')[0];
          const logoSrc = getTeamLogo(nameForLogo); // ← per-team logo
          

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({ pathname: '/(tabs)/team/[id]', params: { id: item.id } })
              }
            >
              <View style={styles.cardText}>
                <Text style={styles.teamName}>{item.name}</Text>
                <Text style={styles.meta}>
                  Captain: <Text style={styles.metaStrong}>{item.captain}</Text>
                </Text>
                <Text style={styles.meta}>
                  Record:{' '}
                  <Text style={styles.metaStrong}>{item.record.wins}-{item.record.losses}</Text>
                </Text>
              </View>

              {/* Right-side logo */}
              <View style={styles.logoContainer}>
              <Image source={logoSrc} style={styles.logo} resizeMode="contain" />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 16 },
  header: { fontSize: 28, fontWeight: 'bold', color: NAVY, textAlign: 'center', marginBottom: 12, fontFamily: FONT_FAMILIES.archivoBlack },
  toggle: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 10, padding: 6, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleActive: { backgroundColor: YELLOW },
  toggleText: { color: YELLOW, fontWeight: '600', fontFamily: FONT_FAMILIES.archivoBlack },
  toggleTextActive: { color: NAVY },

  card: {
    backgroundColor: CARD,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 15,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 2 },
  teamName: { color: YELLOW, fontWeight: 'bold', fontSize: 18, marginBottom: 4, fontFamily: FONT_FAMILIES.archivoBlack},
  meta: { color: TEXT, fontSize: 14, fontFamily: FONT_FAMILIES.archivoNarrow },
  metaStrong: { color: YELLOW, fontWeight: '600', fontFamily: FONT_FAMILIES.archivoBlack},

  logo: {
    width: 75,
    height: 75,
    backgroundColor: CARD
  },
});