// leaderboard/user/[id].tsx - React Navigation Version
import React, { useEffect, useMemo, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, Pressable } from 'react-native';
import { RouteProp, useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { useTournament } from '../../../../context/TournamentContext';
import { getUser, type UserProfile } from '../../../../services/users';
import { FONT_FAMILIES } from '../../../../fonts';

// Define the navigation types - adjust based on your leaderboard stack structure
export type LeaderboardStackParamList = {
  LeaderboardIndex: undefined;
  Player: { id: string };
  User: { id: string };
};

type UserScreenRouteProp = RouteProp<LeaderboardStackParamList, 'User'>;
type UserScreenNavigationProp = NavigationProp<LeaderboardStackParamList, 'User'>;

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';

type RosterRow = {
  id: string;
  name: string;
  teamName: string;
  fantasy: number;
};

// fallback for any unknown slug -> "Eli Plotkin"
function slugToTitle(id: string) {
  return id
    .split('-')
    .map(w => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

// Generate initials from display name for default avatar
function getInitials(displayName: string): string {
  return displayName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function UserLeaderboardDetail() {
  const route = useRoute<UserScreenRouteProp>();
  const navigation = useNavigation<UserScreenNavigationProp>();
  const { id: uid } = route.params;

  // Pull teams & scoring from context (already built from Firestore + schedule aggregation)
  const { teams, calculatePoints } = useTournament();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const [showEnlargedPhoto, setShowEnlargedPhoto] = useState<boolean>(false);

  // Build quick lookup maps from context
  const { playersById, teamNameById } = useMemo(() => {
    const pMap = new Map<string, (typeof teams[number]['players'][number])>();
    const tMap = new Map<string, string>();
    for (const t of teams) {
      tMap.set(t.id, t.name);
      for (const p of t.players) pMap.set(p.id, p);
    }
    return { playersById: pMap, teamNameById: tMap };
  }, [teams]);

  // Set header title when profile loads
  useLayoutEffect(() => {
    if (profile) {
      navigation.setOptions({
        title: profile.displayName,
      });
    } else if (!loading) {
      navigation.setOptions({
        title: 'User',
      });
    }
  }, [navigation, profile, loading]);

  // 1) fetch user profile (by uid)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!uid) return;
      try {
        setLoading(true);
        const doc = await getUser(uid);
        if (mounted) {
          setProfile(doc);
          setImageError(false); // Reset image error when new profile loads
        }
      } catch (e) {
        console.warn('[user detail] failed to fetch user:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [uid]);

  // 2) Build roster rows entirely from context (compute points via calculatePoints)
  const rows: RosterRow[] = useMemo(() => {
    if (!profile) return [];

    const rosterIds = Array.from(
      new Set([...(profile.boys_roster ?? []), ...(profile.girls_roster ?? [])])
    );

    return rosterIds.map((pid) => {
      const p = playersById.get(pid);

      if (!p) {
        // Unknown id -> show a decent fallback; 0 points if we don't have stats in context
        return {
          id: pid,
          name: slugToTitle(pid),
          teamName: '',
          fantasy: 0,
        };
      }

      return {
        id: p.id,
        name: p.name,
        teamName: teamNameById.get(p.teamId) ?? '',
        fantasy: calculatePoints(p),
      };
    });
  }, [profile, playersById, teamNameById, calculatePoints]);

  const totalPoints = useMemo(
    () => rows.reduce((sum, it) => sum + (Number(it.fantasy) || 0), 0),
    [rows]
  );

  // Handle navigation to player detail
  const navigateToPlayer = (playerId: string) => {
    navigation.navigate('Player', { id: playerId });
  };

  // Profile picture component
  const ProfilePicture = () => {
    if (!profile) return null;

    const hasProfilePicture = profile.photoUrl && !imageError;

    if (hasProfilePicture) {
      return (
        <TouchableOpacity 
          onPress={() => setShowEnlargedPhoto(true)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: profile.photoUrl }}
            style={s.profileImage}
            onError={() => setImageError(true)}
          />
        </TouchableOpacity>
      );
    } else {
      return (
        <View style={s.defaultAvatar}>
          <Text style={s.avatarText}>{getInitials(profile.displayName)}</Text>
        </View>
      );
    }
  };

  if (!profile || loading) {
    return (
      <View style={s.container}>
        <View style={s.headerCard}>
          <Text style={s.name}>{loading ? 'Loading…' : 'User not found'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.headerCard}>
        <View style={s.profileInfo}>
          <View style={s.textInfo}>
            <Text style={s.name}>{profile.displayName}</Text>
            <Text style={s.meta}>@{profile.username}</Text>
            <Text style={s.total}>Total Points: {totalPoints}</Text>
          </View>
          <ProfilePicture />
        </View>
      </View>

      <Text style={s.teamTitle}>Team</Text>

      <FlatList
        data={rows}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={s.row} 
            activeOpacity={0.9}
            onPress={() => navigateToPlayer(item.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.primary} numberOfLines={1}>{item.name}</Text>
              <Text style={s.sub} numberOfLines={1}>{item.teamName}</Text>
            </View>
            <Text style={s.points}>{item.fantasy} pts</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={[s.row, { justifyContent: 'center' }]}>
            <Text style={s.primary}>No players yet</Text>
          </View>
        }
      />
      
      {/* Enlarged Photo Modal */}
      <Modal
        visible={showEnlargedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEnlargedPhoto(false)}
      >
        <Pressable 
          style={s.photoModalBackdrop} 
          onPress={() => setShowEnlargedPhoto(false)}
        >
          <View style={s.enlargedPhotoContainer}>
            {profile?.photoUrl && !imageError && (
              <Image
                source={{ uri: profile.photoUrl }}
                style={s.enlargedPhoto}
                resizeMode="contain"
                onError={() => setImageError(true)}
              />
            )}
            <TouchableOpacity 
              style={s.closePhotoBtn} 
              onPress={() => setShowEnlargedPhoto(false)}
            >
              <Text style={s.closePhotoBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 12 },
  headerCard: { backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 12 },
  profileInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  textInfo: { 
    flex: 1, 
    marginRight: 12 
  },
  name: { color: YELLOW, fontWeight: '900', fontSize: 20, fontFamily: FONT_FAMILIES.archivoBlack },
  meta: { color: TEXT, marginTop: 4, fontFamily: FONT_FAMILIES.archivoNarrow },
  total: { color: TEXT, fontWeight: '900', fontSize: 18, marginTop: 8, fontFamily: FONT_FAMILIES.archivoNarrow },
  teamTitle: { color: YELLOW, fontWeight: '900', fontSize: 20, marginBottom: 5, fontFamily: FONT_FAMILIES.archivoBlack },
  
  // Profile picture styles
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: YELLOW,
  },
  defaultAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: YELLOW,
  },
  avatarText: {
    color: NAVY,
    fontWeight: '900',
    fontSize: 20,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 14 },
  primary: { color: TEXT, fontWeight: '800', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },
  sub: { color: TEXT, fontSize: 12, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow },
  points: { color: YELLOW, fontWeight: '900', fontSize: 18, marginLeft: 10, fontFamily: FONT_FAMILIES.archivoBlack },
  
  // Photo modal styles
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enlargedPhotoContainer: {
    width: '90%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enlargedPhoto: {
    width: '100%',
    height: '90%',
    borderRadius: 12,
  },
  closePhotoBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: YELLOW,
    borderRadius: 8,
  },
  closePhotoBtnText: {
    color: NAVY,
    fontWeight: '900',
    fontSize: 16,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
});