// screens/FantasyScreen.tsx - COMPLETELY REBUILT FOR STABILITY
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  Image,
  Platform,
  ActionSheetIOS,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILIES } from '../../fonts';
import { useTournament } from '../../context/TournamentContext';
import { useAuth } from '../../context/AuthContext';
import { getUser, updateUserProfile } from '../../services/users';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.12)';

const LOGO = require('../../images/MYFT_LOGO.png');

// Lock date: November 7, 2025 at 7:00 AM
const LOCK_DATE = new Date('2025-11-07T07:00:00');

// Helper to get player image URL
function getPlayerImageUrl(playerId: string): string {
  const imageFilename = playerId.replace(/-/g, '');
  return `https://firebasestorage.googleapis.com/v0/b/myft-2025.firebasestorage.app/o/players%2F${playerId}%2F${imageFilename}.jpg?alt=media`;
}

type FilterKey = 'division' | 'school' | null;

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ===== OPTIMIZED PLAYER IMAGE COMPONENT =====
const PlayerImage = React.memo(({ 
  playerId, 
  size = 32,
  onError 
}: { 
  playerId: string; 
  size?: number;
  onError?: (id: string) => void;
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const imageUrl = getPlayerImageUrl(playerId);

  const handleError = useCallback(() => {
    setError(true);
    setLoading(false);
    onError?.(playerId);
  }, [playerId, onError]);

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  if (error) {
    return (
      <View style={[
        styles.playerImagePlaceholder, 
        { width: size, height: size, borderRadius: size / 2 }
      ]}>
        <Ionicons name="person" size={size * 0.56} color={TEXT} />
      </View>
    );
  }

  return (
    <>
      {loading && (
        <View style={[
          styles.playerImagePlaceholder,
          styles.shimmer,
          { width: size, height: size, borderRadius: size / 2 }
        ]} />
      )}
      <Image 
        source={{ uri: imageUrl }}
        style={[
          styles.playerImage,
          { width: size, height: size, borderRadius: size / 2 },
          loading && { position: 'absolute', opacity: 0 }
        ]}
        onError={handleError}
        onLoad={handleLoad}
        defaultSource={undefined}
      />
    </>
  );
});

PlayerImage.displayName = 'PlayerImage';

// ===== SIMPLE PLAYER AVATAR (Fallback) =====
const PlayerAvatar = React.memo(({ name }: { name: string }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
});

PlayerAvatar.displayName = 'PlayerAvatar';

export default function FantasyScreen() {
  const { teams, userRoster, updateRoster, calculatePoints } = useTournament();
  const { user: signedIn } = useAuth();

  /** -------------------------
   *   Lock state
   *  ------------------------- */
  const isLocked = useMemo(() => new Date() >= LOCK_DATE, []);

  /** -------------------------
   *   Loading & Onboarding
   *  ------------------------- */
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const hydratedRef = useRef(false);
  const loadedRef = useRef(false);

  // Check if data is ready
  const dataIsReady = useMemo(() => {
    return teams && teams.length > 0 && teams.some(t => t.players && t.players.length > 0);
  }, [teams]);

  // Load user profile
  useEffect(() => {
    if (loadedRef.current) return;
    if (!dataIsReady) return;
    
    let active = true;
    
    (async () => {
      try {
        if (!signedIn?.uid) {
          if (active) {
            setHasOnboarded(false);
            setIsDataLoading(false);
            loadedRef.current = true;
          }
          return;
        }

        const prof = await getUser(signedIn.uid);
        if (!active) return;

        setHasOnboarded(!!(prof as any)?.hasOnboarded);

        if (!hydratedRef.current) {
          const boys: string[] = Array.isArray((prof as any)?.boys_roster) ? (prof as any).boys_roster : [];
          const girls: string[] = Array.isArray((prof as any)?.girls_roster) ? (prof as any).girls_roster : [];

          const allPlayerIds = new Set(
            teams.flatMap(t => (t.players || []).map(p => p.id).filter(Boolean))
          );

          const validBoys = [...new Set(boys)]
            .filter(id => id && typeof id === 'string' && allPlayerIds.has(id))
            .slice(0, 8);
          const validGirls = [...new Set(girls)]
            .filter(id => id && typeof id === 'string' && allPlayerIds.has(id))
            .slice(0, 4);

          validBoys.forEach(id => updateRoster('boys', id));
          validGirls.forEach(id => updateRoster('girls', id));

          hydratedRef.current = true;
        }
        
        if (active) {
          setIsDataLoading(false);
          loadedRef.current = true;
        }
      } catch (e) {
        console.warn('[fantasy] load failed:', e);
        if (active) {
          setHasOnboarded(false);
          setIsDataLoading(false);
          loadedRef.current = true;
        }
      }
    })();
    
    return () => { active = false; };
  }, [signedIn?.uid, updateRoster, dataIsReady, teams]);

  /** -------------------------
   *   View State
   *  ------------------------- */
  const [tab, setTab] = useState<'all' | 'team'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>(null);
  const [divisionSelected, setDivisionSelected] = useState<'boys' | 'girls' | null>(null);
  const [schoolSelected, setSchoolSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Image error tracking
  const playerImageErrorsRef = useRef<Set<string>>(new Set());
  const handleImageError = useCallback((playerId: string) => {
    playerImageErrorsRef.current.add(playerId);
  }, []);

  /** -------------------------
   *   STABLE Player Lists - Using useMemo with stable keys
   *  ------------------------- */
  const allPlayers = useMemo(() => {
    if (!teams || teams.length === 0) return [];
    
    return teams
      .filter(t => t && t.players && Array.isArray(t.players))
      .flatMap(t => t.players
        .filter(p => p && p.id && p.name)
        .map(p => ({
          id: p.id,
          name: p.name,
          __team: t.name || 'Unknown',
          __division: t.division || 'boys',
          fantasy: calculatePoints(p),
          stats: p.stats,
          teamId: p.teamId,
          division: p.division
        }))
      );
  }, [teams, calculatePoints]);

  const schoolOptions = useMemo(
    () => Array.from(new Set(teams.filter(t => t && t.name).map(t => t.name))).sort(),
    [teams]
  );

  const maxBoys = 8;
  const maxGirls = 4;
  const selectedBoys = userRoster.boys?.length ?? 0;
  const selectedGirls = userRoster.girls?.length ?? 0;
  const totalSelected = selectedBoys + selectedGirls;

  // STABLE: Selected player IDs as a Set
  const selectedIdsSet = useMemo(
    () => new Set([...(userRoster.boys ?? []), ...(userRoster.girls ?? [])]),
    [userRoster]
  );

  // Filtered players for "All Players" tab
  const filteredPlayers = useMemo(() => {
    let arr = [...allPlayers];
    
    if (divisionSelected) {
      arr = arr.filter(p => p.__division === divisionSelected);
    }
    if (schoolSelected) {
      arr = arr.filter(p => p.__team === schoolSelected);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      arr = arr.filter(p => {
        const name = (p.name || '').toLowerCase();
        const team = (p.__team || '').toLowerCase();
        return name.includes(query) || team.includes(query);
      });
    }
    
    return arr.sort((a, b) => b.fantasy - a.fantasy);
  }, [allPlayers, divisionSelected, schoolSelected, searchQuery]);

  // "My Team" players - STABLE with Map lookup
  const myTeamPlayers = useMemo(() => {
    const playerMap = new Map(allPlayers.map(p => [p.id, p]));
    const result: any[] = [];
    
    selectedIdsSet.forEach(id => {
      const player = playerMap.get(id);
      if (player) {
        result.push(player);
      }
    });
    
    return result.sort((a, b) => b.fantasy - a.fantasy);
  }, [allPlayers, selectedIdsSet]);

  /** -------------------------
   *   Handlers - All Memoized
   *  ------------------------- */
  const handlePlayerPress = useCallback((player: any) => {
    setDetail(player);
  }, []);

  const handleRemoveFromTeam = useCallback((player: any) => {
    if (isLocked) {
      Alert.alert('Team Locked', 'Fantasy teams can no longer be modified.');
      return;
    }
    
    const division = player.__division as 'boys' | 'girls';
    Alert.alert(
      'Remove from Team',
      `Remove ${player.name || 'this player'} from your Fantasy roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            updateRoster(division, player.id);
            setDetail(null);
          },
        },
      ],
    );
  }, [isLocked, updateRoster]);

  const handleAddToTeam = useCallback((player: any) => {
    if (isLocked) {
      Alert.alert('Team Locked', 'Fantasy teams can no longer be modified.');
      return;
    }
    
    const division = player.__division as 'boys' | 'girls';
    const already = selectedIdsSet.has(player.id);

    if (already) {
      handleRemoveFromTeam(player);
      return;
    }

    const cap = division === 'boys' ? maxBoys : maxGirls;
    const count = division === 'boys' ? selectedBoys : selectedGirls;
    
    if (count >= cap) {
      Alert.alert(
        'Roster Full',
        `You already have ${cap} ${division === 'boys' ? 'boys' : 'girls'} selected.`,
      );
      return;
    }

    Alert.alert(
      'Add to Team',
      `Add ${player.name || 'this player'} to your Fantasy roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: () => {
            updateRoster(division, player.id);
            setDetail(null);
          },
        },
      ],
    );
  }, [isLocked, selectedIdsSet, selectedBoys, selectedGirls, updateRoster, handleRemoveFromTeam]);

  const onPressFilter = useCallback((key: Exclude<FilterKey, null>) => {
    if (key === 'division' && divisionSelected) { setDivisionSelected(null); return; }
    if (key === 'school' && schoolSelected) { setSchoolSelected(null); return; }

    if (Platform.OS === 'ios') {
      if (key === 'division') {
        ActionSheetIOS.showActionSheetWithOptions(
          { title: 'Select Division', options: ['Cancel', 'Boys', 'Girls'], cancelButtonIndex: 0, userInterfaceStyle: 'dark' },
          idx => {
            if (idx === 1) setDivisionSelected('boys');
            else if (idx === 2) setDivisionSelected('girls');
          },
        );
      } else if (key === 'school') {
        ActionSheetIOS.showActionSheetWithOptions(
          { title: 'Select School', options: ['Cancel', ...schoolOptions], cancelButtonIndex: 0, userInterfaceStyle: 'dark' },
          idx => { if (idx > 0) setSchoolSelected(schoolOptions[idx - 1]); },
        );
      }
    } else {
      setActiveFilter(prev => (prev === key ? null : key));
    }
  }, [divisionSelected, schoolSelected, schoolOptions]);

  const onSaveTeam = useCallback(async () => {
    if (!signedIn?.uid) {
      Alert.alert('Not signed in', 'Please sign in to save your team.');
      return;
    }

    try {
      setSaving(true);
      await updateUserProfile(signedIn.uid, {
        boys_roster: [...(userRoster.boys ?? [])],
        girls_roster: [...(userRoster.girls ?? [])],
      });
      
      if (totalSelected === 0) {
        Alert.alert('Team Cleared', 'Your fantasy roster has been cleared.');
      } else if (selectedBoys === maxBoys && selectedGirls === maxGirls) {
        Alert.alert('Team Saved', 'Your complete fantasy roster has been saved!');
      } else {
        Alert.alert('Team Saved', `Your team has been saved! You have ${selectedBoys}/${maxBoys} boys and ${selectedGirls}/${maxGirls} girls selected.`);
      }
    } catch (e: any) {
      console.warn('[fantasy] save failed:', e);
      Alert.alert('Save Failed', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [signedIn?.uid, userRoster, totalSelected, selectedBoys, selectedGirls]);

  const onContinueOnboarding = useCallback(async () => {
    setHasOnboarded(true);
    if (signedIn?.uid) {
      try {
        await updateUserProfile(signedIn.uid, { hasOnboarded: true });
      } catch (e) {
        console.warn('[fantasy] onboard failed:', e);
      }
    }
  }, [signedIn?.uid]);

  const clearSearch = useCallback(() => setSearchQuery(''), []);

  const keyExtractor = useCallback((item: any) => item?.id || `key-${Math.random()}`, []);

  /** Renders **/
  const renderPlayer = ({ item, index }: any) => {
    if (!item || !item.id || !item.__division) return null;
    
    const isSelected = selectedIdsSet.has(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.row} 
        activeOpacity={0.9} 
        onPress={() => handlePlayerPress(item)}
        disabled={isLocked}
      >
        <PlayerImage 
          playerId={item.id} 
          size={32}
          onError={handleImageError}
        />
        
        <View style={styles.playerInfo}>
          <Text style={styles.primary} numberOfLines={1}>
            {item.name || 'Unknown Player'}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {item.__team || 'Unknown'} • {capitalize(item.__division || 'boys')}
          </Text>
        </View>
        
        <Text style={styles.points}>{item.fantasy ?? 0} pts</Text>
        
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={YELLOW} style={styles.checkmark} />
        )}
      </TouchableOpacity>
    );
  };

  /** -------------------------
   *   Screens
   *  ------------------------- */
  if (isDataLoading || !dataIsReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={YELLOW} />
        <Text style={styles.loadingText}>Loading players...</Text>
      </View>
    );
  }

  if (!hasOnboarded) {
    return (
      <View style={styles.onboardOuter}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.onboardTitle}>Welcome to MYFT 2025 Fantasy Football!</Text>
        <Text style={styles.onboardSub}>Press continue to get started building your roster!</Text>
        <TouchableOpacity style={styles.cta} onPress={onContinueOnboarding}>
          <Text style={styles.ctaText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLocked) {
    return (
      <View style={styles.lockedContainer}>
        <Ionicons name="lock-closed" size={80} color={YELLOW} />
        <Text style={styles.lockedTitle}>Fantasy Teams Locked</Text>
        <Text style={styles.lockedText}>No more changes to fantasy teams can be made.</Text>
        <Text style={styles.lockedSubtext}>Your roster has been finalized for the tournament.</Text>
      </View>
    );
  }

  /** -------------------------
   *   Main Screen
   *  ------------------------- */
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topRow}>
        <View style={styles.counter}>
          <Text style={styles.counterText}>Boys: {selectedBoys}/{maxBoys}</Text>
        </View>
        <View style={styles.counter}>
          <Text style={styles.counterText}>Girls: {selectedGirls}/{maxGirls}</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={onSaveTeam}
          disabled={saving}
        >
          <Ionicons name="save-outline" size={16} color={NAVY} />
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Team'}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          onPress={() => setTab('all')}
          style={[styles.toggleBtn, tab === 'all' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, tab === 'all' && styles.toggleTextActive]}>All Players</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('team')}
          style={[styles.toggleBtn, tab === 'team' && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, tab === 'team' && styles.toggleTextActive]}>My Team ({totalSelected})</Text>
        </TouchableOpacity>
      </View>

      {/* Filters - Only show on All Players tab */}
      {tab === 'all' && (
        <>
          <Text style={styles.filterLabel}>Filters</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity
              onPress={() => onPressFilter('division')}
              style={[styles.filterBtn, !!divisionSelected && styles.filterBtnActive]}
            >
              <Text style={[styles.filterBtnText, !!divisionSelected && styles.filterBtnTextActive]}>
                {`Division${divisionSelected ? `: ${capitalize(divisionSelected)}` : ''}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onPressFilter('school')}
              style={[styles.filterBtn, !!schoolSelected && styles.filterBtnActive]}
            >
              <Text style={[styles.filterBtnText, !!schoolSelected && styles.filterBtnTextActive]}>
                {`School${schoolSelected ? `: ${schoolSelected}` : ''}`}
              </Text>
            </TouchableOpacity>

            {(divisionSelected || schoolSelected) && (
              <TouchableOpacity
                onPress={() => { setDivisionSelected(null); setSchoolSelected(null); }}
                style={styles.filterBtn}
              >
                <Text style={styles.filterBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search-outline" size={20} color={TEXT} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search players..."
                placeholderTextColor={`${TEXT}80`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color={TEXT} />
                </TouchableOpacity>
              )}
            </View>
            {searchQuery.length > 0 && (
              <Text style={styles.searchResults}>
                {filteredPlayers.length} result{filteredPlayers.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>

          {/* Android dropdown */}
          {Platform.OS !== 'ios' && activeFilter && (
            <View style={styles.dropdown}>
              {activeFilter === 'division' &&
                (['boys', 'girls'] as const).map(opt => (
                  <TouchableOpacity key={opt} onPress={() => { setDivisionSelected(opt); setActiveFilter(null); }}>
                    <Text style={styles.dropdownItem}>{capitalize(opt)}</Text>
                  </TouchableOpacity>
                ))}
              {activeFilter === 'school' &&
                schoolOptions.map(opt => (
                  <TouchableOpacity key={opt} onPress={() => { setSchoolSelected(opt); setActiveFilter(null); }}>
                    <Text style={styles.dropdownItem}>{opt}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}
        </>
      )}

      {/* Lists - CRITICAL: Separate keys prevent scroll position conflicts */}
      {tab === 'all' ? (
        <FlatList
          key="all-players-list"
          data={filteredPlayers}
          renderItem={renderPlayer}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={10}
          initialNumToRender={20}
        />
      ) : (
        <FlatList
          key="my-team-list"
          data={myTeamPlayers}
          renderItem={renderPlayer}
          keyExtractor={keyExtractor}
          ListEmptyComponent={<Text style={styles.empty}>No players yet. Pick from All Players.</Text>}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal */}
      <Modal
        visible={!!detail}
        transparent
        animationType="fade"
        onRequestClose={() => setDetail(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setDetail(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {detail && (
              <>
                <PlayerImage 
                  playerId={detail.id} 
                  size={80}
                  onError={handleImageError}
                />
                
                <Text style={styles.modalTitle}>{detail.name || 'Unknown Player'}</Text>
                <Text style={styles.modalMeta}>
                  {detail.__team || 'Unknown'} • {capitalize(detail.__division || 'boys')}
                </Text>

                <View style={styles.statRow}>
                  <Text style={styles.statText}>Fantasy Points: </Text>
                  <Text style={[styles.statText, styles.pointsHighlight]}>
                    {detail.fantasy ?? 0}
                  </Text>
                </View>

                {selectedIdsSet.has(detail.id) ? (
                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveFromTeam(detail)}>
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.removeBtnText}>Remove Player</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.addBtn} onPress={() => handleAddToTeam(detail)}>
                    <Ionicons name="add-circle-outline" size={18} color={NAVY} />
                    <Text style={styles.addBtnText}>Add Player</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.closeBtn} onPress={() => setDetail(null)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 12 },
  
  loadingContainer: { flex: 1, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: TEXT, fontSize: 16, marginTop: 16, fontFamily: FONT_FAMILIES.archivoNarrow },

  lockedContainer: { flex: 1, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', padding: 20 },
  lockedTitle: { color: YELLOW, fontSize: 28, fontWeight: '900', textAlign: 'center', marginTop: 20, fontFamily: FONT_FAMILIES.archivoBlack },
  lockedText: { color: TEXT, fontSize: 18, textAlign: 'center', marginTop: 12, fontFamily: FONT_FAMILIES.archivoNarrow },
  lockedSubtext: { color: TEXT, fontSize: 14, textAlign: 'center', marginTop: 8, opacity: 0.8, fontFamily: FONT_FAMILIES.archivoNarrow },

  onboardOuter: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: -50 },
  onboardTitle: { color: YELLOW, fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 12, fontFamily: FONT_FAMILIES.archivoBlack },
  onboardSub: { color: TEXT, opacity: 0.9, textAlign: 'center', marginTop: 8, fontFamily: FONT_FAMILIES.archivoNarrow },
  cta: { marginTop: 16, backgroundColor: YELLOW, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
  ctaText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  logo: { width: '70%', height: 150, alignSelf: 'center', marginBottom: 10, marginTop: -40 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  counter: { backgroundColor: '#0b3c70', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: LINE },
  counterText: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  saveBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: YELLOW, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#062a4e', alignItems: 'center' },
  toggleActive: { backgroundColor: '#0b3c70' },
  toggleText: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  toggleTextActive: { color: YELLOW, fontFamily: FONT_FAMILIES.archivoBlack },

  filterLabel: { color: YELLOW, fontWeight: '700', fontSize: 16, marginBottom: 8, fontFamily: FONT_FAMILIES.archivoBlack },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: CARD },
  filterBtnActive: { backgroundColor: YELLOW },
  filterBtnText: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  filterBtnTextActive: { color: NAVY, fontFamily: FONT_FAMILIES.archivoBlack },

  searchContainer: { marginBottom: 12 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: LINE },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: TEXT, fontSize: 16, fontFamily: FONT_FAMILIES.archivoNarrow, paddingVertical: 12 },
  clearButton: { padding: 4, marginLeft: 8 },
  searchResults: { color: TEXT, fontSize: 12, marginTop: 4, marginLeft: 4, fontFamily: FONT_FAMILIES.archivoNarrow, opacity: 0.8 },

  dropdown: { backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', padding: 8, marginBottom: 8 },
  dropdownItem: { color: TEXT, paddingVertical: 10, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: LINE },
  
  playerImage: {},
  playerImagePlaceholder: {
    backgroundColor: '#062a4e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmer: {
    backgroundColor: '#0b3c70',
    opacity: 0.5,
  },
  
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0b3c70', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: YELLOW, fontSize: 14, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },
  
  playerInfo: { flex: 1, marginLeft: 12 },
  primary: { color: TEXT, fontWeight: '800', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },
  sub: { color: TEXT, fontSize: 12, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow },
  points: { color: YELLOW, fontWeight: '900', fontSize: 16, marginLeft: 8, fontFamily: FONT_FAMILIES.archivoBlack },
  checkmark: { marginLeft: 8 },

  empty: { color: TEXT, textAlign: 'center', marginTop: 30, fontFamily: FONT_FAMILIES.archivoNarrow },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '88%', backgroundColor: NAVY, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)' },
  
  modalTitle: { color: YELLOW, fontSize: 20, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack, marginTop: 12 },
  modalMeta: { color: TEXT, marginTop: 6, marginBottom: 12, fontFamily: FONT_FAMILIES.archivoNarrow },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statText: { color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  pointsHighlight: { color: YELLOW, fontWeight: '900' },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: YELLOW, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 8 },
  addBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E74C3C', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 8 },
  removeBtnText: { color: '#fff', fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  closeBtn: { paddingVertical: 8, paddingHorizontal: 10 },
  closeBtnText: { color: TEXT, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoBlack },
});