// screens/TeamScreen.tsx - React Navigation Version with Record Sorting
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

  const filteredTeams = useMemo(() => {
    // Filter by division
    const divisionTeams = teams.filter(t => t.division === division);
    
    
    // Sort by record (wins descending), then by strength of schedule (descending) as tiebreaker, then by losses (ascending)
    const sorted = divisionTeams.sort((a, b) => {
      // First, compare by wins (more wins = higher ranking)
      const winsA = a.record?.wins ?? 0;
      const winsB = b.record?.wins ?? 0;
      
      if (winsA !== winsB) {
        return winsB - winsA; // Descending order (more wins first)
      }
      
      // If wins are equal, use strength of schedule as tiebreaker
      // Convert to numbers explicitly in case they're stored as strings
      const sosRawA = (a as any).strengthOfSchedule;
      const sosRawB = (b as any).strengthOfSchedule;
      const sosA = Number(sosRawA) || 0;
      const sosB = Number(sosRawB) || 0;
      
      if (sosA !== sosB) {
        return sosB - sosA; // Descending order (higher SOS first)
      }
      
      // If wins and SOS are equal, compare by losses (fewer losses = higher ranking)
      const lossesA = a.record?.losses ?? 0;
      const lossesB = b.record?.losses ?? 0;
      
      if (lossesA !== lossesB) {
        return lossesA - lossesB; // Ascending order (fewer losses first)
      }
      
      // If everything is equal, maintain stable sort by team name
      return a.name.localeCompare(b.name);
    });
    
    return sorted;
  }, [teams, division]);

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