// team/[id].tsx - React Navigation Version
import React, { useMemo, useLayoutEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { RouteProp, useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTournament } from '../../../context/TournamentContext';
import { getTeamLogo } from '../../../team_logos';
import { FONT_FAMILIES } from '../../../fonts';

// Import the navigation types from your layout
import { TeamStackParamList } from './_layout';

type TeamDetailRouteProp = RouteProp<TeamStackParamList, 'TeamDetail'>;
type TeamDetailNavigationProp = NavigationProp<TeamStackParamList, 'TeamDetail'>;

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';

// Helper to get player image URL
function getPlayerImageUrl(playerId: string): string {
  // Convert firstname-lastname to firstnamelastname for the image filename
  const imageFilename = playerId.replace(/-/g, '');
  // Construct the direct Firebase Storage URL
  return `https://firebasestorage.googleapis.com/v0/b/myft-2025.firebasestorage.app/o/players%2F${playerId}%2F${imageFilename}.jpg?alt=media`;
}

export default function TeamDetailScreen() {
  const route = useRoute<TeamDetailRouteProp>();
  const navigation = useNavigation<TeamDetailNavigationProp>();
  const { id } = route.params;
  
  const { teams, calculatePoints } = useTournament();
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const team = useMemo(() => teams.find(t => t.id === id), [teams, id]);
  const players = team?.players ?? [];
  const nameForLogo = team?.id.split('-')[0];
  const logoSrc = getTeamLogo(nameForLogo);

  // Set header title when team loads
  useLayoutEffect(() => {
    if (team) {
      navigation.setOptions({
        title: team.name,
      });
    } else {
      navigation.setOptions({
        title: 'Team',
      });
    }
  }, [navigation, team]);

  // Navigation handler
  const navigateToPlayer = (playerId: string) => {
    navigation.navigate('Player', { id: playerId });
  };

  const navigateToTeams = () => {
    navigation.navigate('TeamIndex');
  };

  // ---------- Guard for bad / missing id ----------
  if (!team) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={{ color: YELLOW, fontSize: 16, marginBottom: 12 }}>
          Team not found.
        </Text>
        <TouchableOpacity
          onPress={navigateToTeams}
          style={{ backgroundColor: YELLOW, padding: 12, borderRadius: 8, alignSelf: 'flex-start' }}
        >
          <Text style={{ color: NAVY, fontWeight: '700' }}>Go to Teams</Text>
        </TouchableOpacity>
      </View>
    );
  }
  // ------------------------------------------------

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{team.name}</Text>
          <Text style={styles.meta}>
            Captain: <Text style={styles.metaStrong}>{team.captain}</Text>
          </Text>
          <Text style={styles.meta}>
            Record: <Text style={styles.metaStrong}>{team.record.wins}-{team.record.losses}</Text>
          </Text>
        </View>
        <View style={styles.logoContainer}>
        {logoSrc ? <Image source={logoSrc} style={styles.logo} resizeMode="contain" /> : null}
        </View>
      </View>

      <FlatList
        style={{ marginTop: 12 }}
        data={players}
        keyExtractor={(p) => p.id}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const pts = calculatePoints(item);
          const imageUrl = getPlayerImageUrl(item.id);
          const hasError = imageErrors.has(item.id);
          
          return (
            <TouchableOpacity 
              style={styles.playerRow}
              onPress={() => navigateToPlayer(item.id)}
            >
              {/* Player Image */}
              {!hasError ? (
                <Image 
                  source={{ uri: imageUrl }} 
                  style={styles.playerImage}
                  onError={() => {
                    setImageErrors(prev => new Set(prev).add(item.id));
                  }}
                />
              ) : (
                <View style={styles.playerImagePlaceholder}>
                  <Ionicons name="person" size={18} color={TEXT} />
                </View>
              )}
              
              <Text style={styles.playerName}>{item.name}</Text>
              <Text style={styles.playerPts}>{pts} pts</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 16 },

  headerBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: { flex: 1 },
  title: { color: YELLOW, fontWeight: 'bold', fontSize: 28, marginBottom: 6, fontFamily: FONT_FAMILIES.archivoBlack },
  meta: { color: TEXT, fontSize: 14, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow},
  metaStrong: { color: YELLOW, fontWeight: '600', fontFamily: FONT_FAMILIES.archivoBlack },

  logo: {
    width: 75,
    height: 75,
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 20,
    marginTop: 10,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  playerRow: {
    backgroundColor: CARD,
    padding: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Player image styles
  playerImage: {
    width: 45,
    height: 45,
    borderRadius: 16,
    marginRight: 12,
  },
  playerImagePlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#062a4e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  playerName: { flex: 1, color: YELLOW, fontSize: 20, fontWeight: '600', fontFamily: FONT_FAMILIES.archivoBlack },
  playerMeta: { width: 60, textAlign: 'right', color: '#D7E3F4', fontFamily: FONT_FAMILIES.archivoNarrow},
  playerPts: { width: 70, textAlign: 'right', color: YELLOW, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoBlack },
});