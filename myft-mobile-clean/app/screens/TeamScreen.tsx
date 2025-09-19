// screens/TeamScreen.tsx - React Navigation Version
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Image } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTournament } from '../../context/TournamentContext';
import { getTeamLogo } from '../../team_logos';
import { FONT_FAMILIES } from '../../fonts';

// Import the navigation types - you may need to adjust the import path
import { TeamStackParamList } from '../(tabs)/team/_layout';

type TeamScreenNavigationProp = NavigationProp<TeamStackParamList, 'TeamIndex'>;

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';

export default function TeamScreen() {
  const navigation = useNavigation<TeamScreenNavigationProp>();
  const { teams } = useTournament();
  const [division, setDivision] = useState<'boys' | 'girls'>('boys');

  const filteredTeams = useMemo(
    () => teams.filter(t => t.division === division),
    [teams, division]
  );

  // Navigation handler
  const navigateToTeam = (teamId: string) => {
    navigation.navigate('TeamDetail', { id: teamId });
  };

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
          const logoSrc = getTeamLogo(nameForLogo);

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigateToTeam(item.id)}
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
  teamName: { color: YELLOW, fontWeight: 'bold', fontSize: 20, marginBottom: 4, fontFamily: FONT_FAMILIES.archivoNarrow},
  meta: { color: TEXT, fontSize: 14, fontFamily: FONT_FAMILIES.archivoNarrow },
  metaStrong: { color: YELLOW, fontWeight: '600', fontFamily: FONT_FAMILIES.archivoBlack},

  logo: {
    width: 75,
    height: 75,
    backgroundColor: CARD
  },
});