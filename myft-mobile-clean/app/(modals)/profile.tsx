// app/(modals)/profile.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Linking,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { FONT_FAMILIES } from '../../fonts';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../services/firebaseConfig';
import { storage, db } from '../../services/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.25)';
const DEFAULT_AVATAR = require('../../images/default-avatar.png');
const ADMIN_PANEL_PASSWORD = 'mYft2025###';
// Stat names in order matching seasonTotals array
const STAT_NAMES = [
  'Touchdowns',
  'Passing TDs',
  'Minimal Receptions',
  'Short Receptions',
  'Medium Receptions',
  'Long Receptions',
  'Catches',
  'Flags Pulled',
  'Sacks',
  'Interceptions',
  'Passing Interceptions',
];

const GAME_STATUS_OPTIONS = ['Scheduled', 'Live', 'Final'];

interface Player {
  id: string;
  display_name?: string;
  team_id?: string;
  seasonTotals?: number[];
}

interface Game {
  id: string;
  team1ID: string;
  team2ID: string;
  team1score: number;
  team2score: number;
  status: string;
}

interface Team {
  id: string;
  name?: string;
  record?: number[]; // [wins, losses]
  pointDifferential?: number; // Point differential (can be negative)
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, updateUser, refreshUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [photoUri, setPhotoUri] = useState<string | undefined>(user?.photoUrl ?? undefined);
  const [photo, setPhoto] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin panel states
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminTab, setAdminTab] = useState<'players' | 'games'>('players');
  
  // Players admin states
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [editingStats, setEditingStats] = useState<number[]>([]);
  
  // Games admin states
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [editingGame, setEditingGame] = useState<{ 
    status: string; 
    team1score: number; 
    team2score: number;
    team1ID: string;
    team2ID: string;
  } | null>(null);
  
  // Teams data for editing game teams
  const [teams, setTeams] = useState<Team[]>([]);
  
  const [adminLoading, setAdminLoading] = useState(false);

  // Expo SDK uses string union for mediaTypes; Images shortcut is fine
  const MEDIA_IMAGE: any = (ImagePicker as any).MediaType?.Image;

  // Load user data function
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }

      // Refresh user data from Firebase
      if (refreshUser) {
        await refreshUser();
      }
      
      // Wait a bit for the context to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err: any) {
      console.error('Failed to load user data:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  // Update local state when user data changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? '');
      setUsername(user.username ?? '');
      setPhotoUri(user.photoUrl ?? undefined);
      setLoading(false);
    }
  }, [user?.displayName, user?.username, user?.photoUrl, user]);

  // Load data on component mount
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        await loadUserData();
      } else {
        setLoading(false);
        setError('Not authenticated');
      }
    });

    return unsubscribe;
  }, [loadUserData]);

  // ---------- Permission helpers ----------
  const ensureLibraryPermission = async (): Promise<boolean> => {
    const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (status === 'granted') return true;
    if (canAskAgain) {
      const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (req.status === 'granted') return true;
    }
    Alert.alert(
      'Allow Photo Access',
      'To choose a profile photo, please allow access to your photo library.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  };

  const ensureCameraPermission = async (): Promise<boolean> => {
    const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();
    if (status === 'granted') return true;
    if (canAskAgain) {
      const req = await ImagePicker.requestCameraPermissionsAsync();
      if (req.status === 'granted') return true;
    }
    Alert.alert(
      'Allow Camera Access',
      'To take a profile photo, please allow camera access.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  };

  // ---------- Upload helper (Storage -> Firestore photoUrl) ----------
  const uploadAndSavePhoto = async (localUri: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    try {
      setUploading(true);

      // Fetch the local file into a Blob (Expo compatible)
      const resp = await fetch(localUri);
      const blob = await resp.blob();

      const objectRef = ref(storage, `users/${uid}/avatar.jpg`);
      await uploadBytes(objectRef, blob);
      const downloadUrl = await getDownloadURL(objectRef);

      // Update Firestore user doc
      await updateUser({ photoUrl: downloadUrl });

      // Update local UI
      setPhotoUri(downloadUrl);
      setAvatarOpen(false);
      
      // Refresh user data to ensure consistency
      await loadUserData();
    } catch (e: any) {
      console.warn('[profile] upload photo failed:', e);
      Alert.alert('Upload failed', e?.message ?? 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ---------- Photo actions ----------
  const pickFromLibrary = async () => {
    if (!(await ensureLibraryPermission())) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: MEDIA_IMAGE,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!res.canceled) {
      const uri = res.assets[0].uri;
      await uploadAndSavePhoto(uri);
    }
  };

  const takeWithCamera = async () => {
    if (!(await ensureCameraPermission())) return;
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!res.canceled) {
      const uri = res.assets[0].uri;
      await uploadAndSavePhoto(uri);
    }
  };

  const changePhoto = () => {
    const actions: any[] = [
      { text: 'Camera', onPress: takeWithCamera },
      { text: 'Photo Library', onPress: pickFromLibrary },
      photoUri
        ? {
            text: 'Remove Photo',
            style: 'destructive',
            onPress: async () => {
              try {
                await updateUser({ photoUrl: undefined });
                setPhotoUri(undefined);
                await loadUserData();
                setAvatarOpen(false);
              } catch (e: any) {
                Alert.alert('Error', 'Failed to remove photo');
              }
            },
          }
        : undefined,
      { text: 'Cancel', style: 'cancel' },
    ].filter(Boolean);

    Alert.alert('Change Photo', 'Pick a source', actions);
  };

  // ---------- Save edits (writes to Firestore via AuthContext) ----------
  const onSave = async () => {
    try {
      setSaving(true);
      await updateUser({
        displayName: displayName.trim(),
        username: username.trim(),
      });
      setEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
      // Refresh data after save
      await loadUserData();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save profile changes');
    } finally {
      setSaving(false);
    }
  };

  const resetEdits = () => {
    setDisplayName(user?.displayName ?? '');
    setUsername(user?.username ?? '');
    setEditing(false);
  };

  // ---------- Copy helper ----------
  const copyEmail = async (email: string) => {
    try {
      await Clipboard.setStringAsync(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  // ---------- Admin Panel Functions ----------
  const handleSettingsPress = () => {
    setShowPasswordPrompt(true);
    setPasswordInput('');
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PANEL_PASSWORD) {
      setShowPasswordPrompt(false);
      setShowAdminPanel(true);
      loadAdminData();
    } else {
      Alert.alert('Access Denied', 'Incorrect password');
      setPasswordInput('');
    }
  };

  const loadAdminData = async () => {
    setAdminLoading(true);
    try {
      // Load players
      const playersSnap = await getDocs(collection(db, 'players'));
      const playersData: Player[] = [];
      playersSnap.forEach((doc) => {
        playersData.push({ id: doc.id, ...doc.data() } as Player);
      });
      setPlayers(playersData);
      setFilteredPlayers(playersData);

      // Load games
      const gamesSnap = await getDocs(collection(db, 'games'));
      const gamesData: Game[] = [];
      gamesSnap.forEach((doc) => {
        gamesData.push({ id: doc.id, ...doc.data() } as Game);
      });
      setGames(gamesData);
      setFilteredGames(gamesData);

      // Load teams
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const teamsData: Team[] = [];
      teamsSnap.forEach((doc) => {
        teamsData.push({ id: doc.id, ...doc.data() } as Team);
      });
      setTeams(teamsData);
    } catch (e) {
      console.error('Failed to load admin data:', e);
      Alert.alert('Error', 'Failed to load admin data');
    } finally {
      setAdminLoading(false);
    }
  };

  // Player search
  useEffect(() => {
    if (playerSearchQuery.trim() === '') {
      setFilteredPlayers(players);
    } else {
      const query = playerSearchQuery.toLowerCase();
      setFilteredPlayers(
        players.filter((p) => {
          const name = p.display_name?.toLowerCase() || p.id.toLowerCase();
          const teamId = p.team_id?.toLowerCase() || '';
          return name.includes(query) || teamId.includes(query);
        })
      );
    }
  }, [playerSearchQuery, players]);

  // Game search
  useEffect(() => {
    if (gameSearchQuery.trim() === '') {
      setFilteredGames(games);
    } else {
      const query = gameSearchQuery.toLowerCase();
      setFilteredGames(
        games.filter((g) => {
          const team1 = g.team1ID?.toLowerCase() || '';
          const team2 = g.team2ID?.toLowerCase() || '';
          return team1.includes(query) || team2.includes(query) || g.id.toLowerCase().includes(query);
        })
      );
    }
  }, [gameSearchQuery, games]);

  const handlePlayerSelect = (player: Player) => {
    setSelectedPlayer(player);
    setEditingStats(player.seasonTotals || new Array(11).fill(0));
  };

  const handleStatChange = (index: number, delta: number) => {
    setEditingStats((prev) => {
      const newStats = [...prev];
      newStats[index] = Math.max(0, (newStats[index] || 0) + delta);
      return newStats;
    });
  };

  const handleSavePlayer = async () => {
    if (!selectedPlayer) return;
    
    try {
      setAdminLoading(true);
      const playerRef = doc(db, 'players', selectedPlayer.id);
      await updateDoc(playerRef, { seasonTotals: editingStats });
      
      // Update local state
      setPlayers((prev) =>
        prev.map((p) => (p.id === selectedPlayer.id ? { ...p, seasonTotals: editingStats } : p))
      );
      
      Alert.alert('Success', 'Player stats updated successfully');
      setSelectedPlayer(null);
      setEditingStats([]);
    } catch (e) {
      console.error('Failed to update player:', e);
      Alert.alert('Error', 'Failed to update player stats');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setEditingGame({
      status: game.status,
      team1score: game.team1score,
      team2score: game.team2score,
      team1ID: game.team1ID,
      team2ID: game.team2ID,
    });
  };

  const handleSaveGame = async () => {
    if (!selectedGame || !editingGame) return;
    
    try {
      setAdminLoading(true);
      
      // Update game document
      const gameRef = doc(db, 'games', selectedGame.id);
      await updateDoc(gameRef, {
        status: editingGame.status,
        team1score: editingGame.team1score,
        team2score: editingGame.team2score,
        team1ID: editingGame.team1ID,
        team2ID: editingGame.team2ID,
      });
      
      // Update local state
      setGames((prev) =>
        prev.map((g) =>
          g.id === selectedGame.id
            ? { 
                ...g, 
                status: editingGame.status, 
                team1score: editingGame.team1score, 
                team2score: editingGame.team2score,
                team1ID: editingGame.team1ID,
                team2ID: editingGame.team2ID,
              }
            : g
        )
      );
      
      Alert.alert('Success', 'Game updated successfully');
      setSelectedGame(null);
      setEditingGame(null);
    } catch (e) {
      console.error('Failed to update game:', e);
      Alert.alert('Error', 'Failed to update game');
    } finally {
      setAdminLoading(false);
    }
  };

  // Helper to update team record
  const updateTeamRecord = async (teamId: string, wins: number, losses: number) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        record: [wins, losses]
      });
      
      // Update local teams state
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId ? { ...t, record: [wins, losses] } : t
        )
      );
    } catch (e) {
      console.error('Failed to update team record:', e);
      throw e;
    }
  };

  // Get team record by ID
  const getTeamRecord = (teamId: string): number[] => {
    const team = teams.find(t => t.id === teamId);
    return team?.record || [0, 0];
  };

  // Helper to get team point differential
  const getTeamPointDifferential = (teamId: string): number => {
    const team = teams.find(t => t.id === teamId);
    return team?.pointDifferential ?? 0;
  };

  // Helper to update team point differential
  const updateTeamPointDifferential = async (teamId: string, pd: number) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        pointDifferential: pd
      });
      
      // Update local teams state
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId ? { ...t, pointDifferential: pd } : t
        )
      );
    } catch (e) {
      console.error('Failed to update team point differential:', e);
      throw e;
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={[s.outer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={YELLOW} />
        <Text style={[s.value, { marginTop: 16 }]}>Loading profile...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[s.outer, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={[s.value, { color: '#ff6b6b', textAlign: 'center', marginBottom: 16 }]}>
          Error: {error}
        </Text>
        <TouchableOpacity style={s.actionBtn} onPress={loadUserData}>
          <Text style={s.actionText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.outer}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
    >
      <TouchableOpacity style={s.modalCloseX} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={26} color={TEXT} />
      </TouchableOpacity>

      {/* Settings Icon for Admin Panel */}
      <TouchableOpacity style={s.settingsIcon} onPress={handleSettingsPress}>
        <Ionicons name="settings-outline" size={26} color={TEXT} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.scroll} bounces={false}>
        <Text style={s.title}>My Profile</Text>
        <View style={s.sheet}>
          <View style={s.avatarRow}>
            <TouchableOpacity onPress={() => setAvatarOpen(true)} activeOpacity={0.8}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarPlaceholder]}>
                  <Image source={DEFAULT_AVATAR} style={s.avatarImg} />
                </View>
              )}
            </TouchableOpacity>

            <View style={s.infoCol}>
              <Text style={s.label}>Name</Text>
              <Text style={s.value}>{user?.displayName ?? '—'}</Text>
              <View style={{ height: 8 }} />
              <Text style={s.label}>Username</Text>
              <Text style={s.value}>{user?.username ?? '—'}</Text>
              <View style={{ height: 10 }} />

              {!editing ? (
                <TouchableOpacity style={s.smallBtn} onPress={() => setEditing(true)}>
                  <Ionicons name="create-outline" size={16} color={NAVY} />
                  <Text style={s.smallBtnText}>Change Name</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {editing ? (
            <View>
              <View style={s.field}>
                <Text style={s.editLabel}>Edit Name</Text>
                <TextInput
                  placeholder="Display name"
                  placeholderTextColor="#94a3b8"
                  value={displayName}
                  onChangeText={setDisplayName}
                  style={s.input}
                />
              </View>

              <View style={s.field}>
                <Text style={s.editLabel}>Edit Username</Text>
                <TextInput
                  placeholder="Username"
                  autoCapitalize="none"
                  placeholderTextColor="#94a3b8"
                  value={username}
                  onChangeText={setUsername}
                  style={s.input}
                />
              </View>

              <View style={s.actionsRow}>
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: '#1c2f4f' }]}
                  onPress={resetEdits}
                >
                  <Text style={[s.actionText, { color: YELLOW }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.actionBtn} onPress={onSave} disabled={saving}>
                  <Text style={s.actionText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        <View style={[s.sheet, { marginTop: 10 }]}>
          <Text style={[s.title, { marginBottom: 8 }]}>Need Help?</Text>
          <Text style={s.supportText}>
            Thank you for using the MYFT app!{'\n'}
            For any questions, please email Jack Baum:
          </Text>

          <TouchableOpacity
            style={s.copyChip}
            onPress={() => copyEmail('jackbaum@umich.edu')}
            activeOpacity={0.85}
          >
            <Text style={s.copyChipText}>jackbaum@umich.edu</Text>
            <Ionicons name="copy-outline" size={20} color={YELLOW} />
          </TouchableOpacity>

          {copied ? <Text style={s.copiedHint}>Copied!</Text> : null}
        </View>
      </ScrollView>

      {/* Avatar modal with Change Photo */}
      <Modal
        visible={avatarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarOpen(false)}
      >
        <View style={s.backdrop}>
          <View style={s.modalCard}>
            <TouchableOpacity style={s.modalCloseX} onPress={() => setAvatarOpen(false)}>
              <Ionicons name="close" size={26} color={TEXT} />
            </TouchableOpacity>

            <Text style={s.modalTitle}>Profile Photo</Text>

            <View style={s.modalAvatarWrap}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={s.modalAvatarImg} />
              ) : (
                <View style={[s.modalAvatarImg, s.modalPlaceholder]}>
                  <Image source={DEFAULT_AVATAR} style={s.avatarImg} />
                </View>
              )}
            </View>

            <TouchableOpacity style={s.bigBtn} onPress={changePhoto} disabled={uploading}>
              <Ionicons name="camera-outline" size={20} color={NAVY} />
              <Text style={s.bigBtnText}>{uploading ? 'Uploading…' : 'Change Photo'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Prompt Modal */}
      <Modal
        visible={showPasswordPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordPrompt(false)}
      >
        <View style={s.backdrop}>
          <View style={[s.modalCard, { width: '85%' }]}>
            <TouchableOpacity style={s.modalCloseX} onPress={() => setShowPasswordPrompt(false)}>
              <Ionicons name="close" size={26} color={TEXT} />
            </TouchableOpacity>

            <Text style={s.modalTitle}>Admin Access</Text>
            <Text style={[s.supportText, { marginBottom: 16 }]}>Enter admin password</Text>

            <TextInput
              style={s.passwordInput}
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              value={passwordInput}
              onChangeText={setPasswordInput}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={handlePasswordSubmit}
            />

            <TouchableOpacity style={s.bigBtn} onPress={handlePasswordSubmit}>
              <Text style={s.bigBtnText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Admin Panel Modal */}
      <Modal
        visible={showAdminPanel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdminPanel(false)}
      >
        <View style={s.adminContainer}>
          <View style={s.adminHeader}>
            <Text style={s.adminTitle}>Admin Panel</Text>
            <TouchableOpacity onPress={() => setShowAdminPanel(false)}>
              <Ionicons name="close" size={28} color={TEXT} />
            </TouchableOpacity>
          </View>

          {/* Admin Tabs */}
          <View style={s.adminTabs}>
            <TouchableOpacity
              style={[s.adminTab, adminTab === 'players' && s.adminTabActive]}
              onPress={() => {
                setAdminTab('players');
                setSelectedPlayer(null);
                setSelectedGame(null);
              }}
            >
              <Text style={[s.adminTabText, adminTab === 'players' && s.adminTabTextActive]}>
                Players
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.adminTab, adminTab === 'games' && s.adminTabActive]}
              onPress={() => {
                setAdminTab('games');
                setSelectedPlayer(null);
                setSelectedGame(null);
              }}
            >
              <Text style={[s.adminTabText, adminTab === 'games' && s.adminTabTextActive]}>
                Games
              </Text>
            </TouchableOpacity>
          </View>

          {adminLoading && (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={YELLOW} />
            </View>
          )}

          {/* Players Tab */}
          {adminTab === 'players' && !adminLoading && (
            <>
              {!selectedPlayer ? (
                <>
                  {/* Player Search */}
                  <View style={s.searchContainer}>
                    <Ionicons name="search-outline" size={20} color={TEXT} />
                    <TextInput
                      style={s.searchInput}
                      placeholder="Search players..."
                      placeholderTextColor="#94a3b8"
                      value={playerSearchQuery}
                      onChangeText={setPlayerSearchQuery}
                    />
                    {playerSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setPlayerSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={TEXT} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Players List */}
                  <FlatList
                    data={filteredPlayers}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={s.adminListItem}
                        onPress={() => handlePlayerSelect(item)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={s.adminListName}>
                            {item.display_name || item.id}
                          </Text>
                          <Text style={s.adminListSub}>Team: {item.team_id || 'N/A'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={TEXT} />
                      </TouchableOpacity>
                    )}
                    style={s.adminList}
                  />
                </>
              ) : (
                <ScrollView style={s.adminEditContainer}>
                  <View style={s.adminEditHeader}>
                    <TouchableOpacity onPress={() => setSelectedPlayer(null)}>
                      <Ionicons name="arrow-back" size={24} color={TEXT} />
                    </TouchableOpacity>
                    <Text style={s.adminEditTitle}>
                      {selectedPlayer.display_name || selectedPlayer.id}
                    </Text>
                  </View>

                  <Text style={s.adminEditSubtitle}>
                    Team: {selectedPlayer.team_id || 'N/A'}
                  </Text>

                  <Text style={[s.label, { marginTop: 20, marginBottom: 12 }]}>Season Stats</Text>

                  {STAT_NAMES.map((statName, index) => (
                    <View key={index} style={s.statEditRow}>
                      <Text style={s.statEditName}>{statName}</Text>
                      <View style={s.statEditControls}>
                        <TouchableOpacity
                          style={s.statEditBtn}
                          onPress={() => handleStatChange(index, -1)}
                        >
                          <Ionicons name="remove" size={20} color={NAVY} />
                        </TouchableOpacity>
                        <Text style={s.statEditValue}>{editingStats[index] || 0}</Text>
                        <TouchableOpacity
                          style={s.statEditBtn}
                          onPress={() => handleStatChange(index, 1)}
                        >
                          <Ionicons name="add" size={20} color={NAVY} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={[s.bigBtn, { marginTop: 20, marginBottom: 20 }]}
                    onPress={handleSavePlayer}
                    disabled={adminLoading}
                  >
                    <Ionicons name="save-outline" size={20} color={NAVY} />
                    <Text style={s.bigBtnText}>
                      {adminLoading ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </>
          )}

          {/* Games Tab */}
          {adminTab === 'games' && !adminLoading && (
            <>
              {!selectedGame ? (
                <>
                  {/* Game Search */}
                  <View style={s.searchContainer}>
                    <Ionicons name="search-outline" size={20} color={TEXT} />
                    <TextInput
                      style={s.searchInput}
                      placeholder="Search games..."
                      placeholderTextColor="#94a3b8"
                      value={gameSearchQuery}
                      onChangeText={setGameSearchQuery}
                    />
                    {gameSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setGameSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={TEXT} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Games List */}
                  <FlatList
                    data={filteredGames}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={s.adminListItem}
                        onPress={() => handleGameSelect(item)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={s.adminListName}>
                            {item.id}
                          </Text>
                          <Text style={s.adminListSub}>
                            {item.team1ID} vs {item.team2ID}
                          </Text>
                          <Text style={s.adminListSub}>
                            Status: {item.status} • Score: {item.team1score} - {item.team2score}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={TEXT} />
                      </TouchableOpacity>
                    )}
                    style={s.adminList}
                  />
                </>
              ) : (
                <ScrollView style={s.adminEditContainer}>
                  <View style={s.adminEditHeader}>
                    <TouchableOpacity onPress={() => setSelectedGame(null)}>
                      <Ionicons name="arrow-back" size={24} color={TEXT} />
                    </TouchableOpacity>
                    <Text style={s.adminEditTitle}>Edit Game</Text>
                  </View>

                  <Text style={s.adminEditSubtitle}>Game ID: {selectedGame.id}</Text>

                  {/* Team IDs Editing */}
                  <Text style={[s.label, { marginTop: 20, marginBottom: 12 }]}>Team IDs</Text>
                  
                  <View style={s.teamIdContainer}>
                    <Text style={s.teamIdLabel}>Team 1 ID</Text>
                    <TextInput
                      style={s.teamIdInput}
                      value={editingGame?.team1ID || ''}
                      onChangeText={(text) =>
                        setEditingGame((prev) => (prev ? { ...prev, team1ID: text } : null))
                      }
                      placeholder="team1-id"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={s.teamIdContainer}>
                    <Text style={s.teamIdLabel}>Team 2 ID</Text>
                    <TextInput
                      style={s.teamIdInput}
                      value={editingGame?.team2ID || ''}
                      onChangeText={(text) =>
                        setEditingGame((prev) => (prev ? { ...prev, team2ID: text } : null))
                      }
                      placeholder="team2-id"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {/* Team Records Editing */}
                  <Text style={[s.label, { marginTop: 20, marginBottom: 12 }]}>Team Records</Text>
                  
                  {/* Team 1 Record */}
                  <View style={s.teamRecordContainer}>
                    <Text style={s.teamRecordLabel}>{editingGame?.team1ID || 'Team 1'}</Text>
                    
                    <View style={s.recordRow}>
                      <View style={s.recordColumn}>
                        <Text style={s.recordColumnLabel}>Wins</Text>
                        <View style={s.statEditControls}>
                          <TouchableOpacity
                            style={s.statEditBtn}
                            onPress={async () => {
                              const teamId = editingGame?.team1ID;
                              if (!teamId) return;
                              const [wins, losses] = getTeamRecord(teamId);
                              const newWins = Math.max(0, wins - 1);
                              try {
                                await updateTeamRecord(teamId, newWins, losses);
                              } catch (e) {
                                Alert.alert('Error', 'Failed to update team record');
                              }
                            }}
                          >
                            <Ionicons name="remove" size={20} color={NAVY} />
                          </TouchableOpacity>
                          <Text style={s.statEditValue}>
                            {getTeamRecord(editingGame?.team1ID || '')[0]}
                          </Text>
                          <TouchableOpacity
                            style={s.statEditBtn}
                            onPress={async () => {
                              const teamId = editingGame?.team1ID;
                              if (!teamId) return;
                              const [wins, losses] = getTeamRecord(teamId);
                              const newWins = wins + 1;
                              try {
                                await updateTeamRecord(teamId, newWins, losses);
                              } catch (e) {
                                Alert.alert('Error', 'Failed to update team record');
                              }
                            }}
                          >
                            <Ionicons name="add" size={20} color={NAVY} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={s.recordColumn}>
                        <Text style={s.recordColumnLabel}>Losses</Text>
                        <View style={s.statEditControls}>
                          <TouchableOpacity
                            style={s.statEditBtn}
                            onPress={async () => {
                              const teamId = editingGame?.team1ID;
                              if (!teamId) return;
                              const [wins, losses] = getTeamRecord(teamId);
                              const newLosses = Math.max(0, losses - 1);
                              try {
                                await updateTeamRecord(teamId, wins, newLosses);
                              } catch (e) {
                                Alert.alert('Error', 'Failed to update team record');
                              }
                            }}
                          >
                            <Ionicons name="remove" size={20} color={NAVY} />
                          </TouchableOpacity>
                          <Text style={s.statEditValue}>
                            {getTeamRecord(editingGame?.team1ID || '')[1]}
                          </Text>
                          <TouchableOpacity
                            style={s.statEditBtn}
                            onPress={async () => {
                              const teamId = editingGame?.team1ID;
                              if (!teamId) return;
                              const [wins, losses] = getTeamRecord(teamId);
                              const newLosses = losses + 1;
                              try {
                                await updateTeamRecord(teamId, wins, newLosses);
                              } catch (e) {
                                Alert.alert('Error', 'Failed to update team record');
                              }
                            }}
                          >
                            <Ionicons name="add" size={20} color={NAVY} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Team 2 Record */}
                  <View style={s.teamRecordContainer}>
                    <Text style={s.teamRecordLabel}>{editingGame?.team2ID || 'Team 2'}</Text>
                    
                    <View style={s.recordRow}>
                      <View style={s.recordColumn}>
                        <Text style={s.recordColumnLabel}>Wins</Text>
                        <View style={s.statEditControls}>
                          <TouchableOpacity
                            style={s.statEditBtn}
                            onPress={async () => {
                              const teamId = editingGame?.team2ID;
                              if (!teamId) return;
                              const [wins, losses] = getTeamRecord(teamId);
                              const newWins = Math.max(0, wins - 1);
                              try {
                                await updateTeamRecord(teamId, newWins, losses);
                              } catch (e) {
                                Alert.alert('Error', 'Failed to update team record');
                              }
                            }}
                          >
                            <Ionicons name="remove" size={20} color={NAVY} />
                          </TouchableOpacity>
                          <Text style={s.statEditValue}>
                            {getTeamRecord(editingGame?.team2ID || '')[0]}
                          </Text>
                          <TouchableOpacity
                            style={s.statEditBtn}
                            onPress={async () => {
                              const teamId = editingGame?.team2ID;
                              if (!teamId) return;
                              const [wins, losses] = getTeamRecord(teamId);
                              const newWins = wins + 1;
                              try {
                                await updateTeamRecord(teamId, newWins, losses);
                              } catch (e) {
                                Alert.alert('Error', 'Failed to update team record');
                              }
                            }}
                          >
                            <Ionicons name="add" size={20} color={NAVY} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={s.recordColumn}>
                        <Text style={s.recordColumnLabel}>Losses</Text>
                        <View style={s.statEditControls}>
                          <TouchableOpacity
                            style={s.statEditBtn}
                            onPress={async () => {
                              const teamId = editingGame?.team2ID;
                              if (!teamId) return;
                              const [wins, losses] = getTeamRecord(teamId);
                              const newLosses = Math.max(0, losses - 1);
                              try {
                                await updateTeamRecord(teamId, wins, newLosses);
                              } catch (e) {
                                Alert.alert('Error', 'Failed to update team record');
                              }
                            }}
                          >
                            <Ionicons name="remove" size={20} color={NAVY} />
                          </TouchableOpacity>
                          <Text style={s.statEditValue}>
                            {getTeamRecord(editingGame?.team2ID || '')[1]}
                          </Text>
                          <TouchableOpacity
                            style={s.statEditBtn}
                            onPress={async () => {
                              const teamId = editingGame?.team2ID;
                              if (!teamId) return;
                              const [wins, losses] = getTeamRecord(teamId);
                              const newLosses = losses + 1;
                              try {
                                await updateTeamRecord(teamId, wins, newLosses);
                              } catch (e) {
                                Alert.alert('Error', 'Failed to update team record');
                              }
                            }}
                          >
                            <Ionicons name="add" size={20} color={NAVY} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Point Differential Editing */}
                  <Text style={[s.label, { marginTop: 20, marginBottom: 12 }]}>Point Differential</Text>

                  {/* Team 1 Point Differential */}
                  <View style={s.teamRecordContainer}>
                    <Text style={s.teamRecordLabel}>{editingGame?.team1ID || 'Team 1'}</Text>
                    
                    <View style={s.statEditControls}>
                      <TouchableOpacity
                        style={s.statEditBtn}
                        onPress={async () => {
                          const teamId = editingGame?.team1ID;
                          if (!teamId) return;
                          const currentPD = getTeamPointDifferential(teamId);
                          const newPD = currentPD - 1;
                          try {
                            await updateTeamPointDifferential(teamId, newPD);
                          } catch (e) {
                            Alert.alert('Error', 'Failed to update point differential');
                          }
                        }}
                      >
                        <Ionicons name="remove" size={20} color={NAVY} />
                      </TouchableOpacity>
                      <Text style={s.statEditValue}>
                        {getTeamPointDifferential(editingGame?.team1ID || '')}
                      </Text>
                      <TouchableOpacity
                        style={s.statEditBtn}
                        onPress={async () => {
                          const teamId = editingGame?.team1ID;
                          if (!teamId) return;
                          const currentPD = getTeamPointDifferential(teamId);
                          const newPD = currentPD + 1;
                          try {
                            await updateTeamPointDifferential(teamId, newPD);
                          } catch (e) {
                            Alert.alert('Error', 'Failed to update point differential');
                          }
                        }}
                      >
                        <Ionicons name="add" size={20} color={NAVY} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Team 2 Point Differential */}
                  <View style={s.teamRecordContainer}>
                    <Text style={s.teamRecordLabel}>{editingGame?.team2ID || 'Team 2'}</Text>
                    
                    <View style={s.statEditControls}>
                      <TouchableOpacity
                        style={s.statEditBtn}
                        onPress={async () => {
                          const teamId = editingGame?.team2ID;
                          if (!teamId) return;
                          const currentPD = getTeamPointDifferential(teamId);
                          const newPD = currentPD - 1;
                          try {
                            await updateTeamPointDifferential(teamId, newPD);
                          } catch (e) {
                            Alert.alert('Error', 'Failed to update point differential');
                          }
                        }}
                      >
                        <Ionicons name="remove" size={20} color={NAVY} />
                      </TouchableOpacity>
                      <Text style={s.statEditValue}>
                        {getTeamPointDifferential(editingGame?.team2ID || '')}
                      </Text>
                      <TouchableOpacity
                        style={s.statEditBtn}
                        onPress={async () => {
                          const teamId = editingGame?.team2ID;
                          if (!teamId) return;
                          const currentPD = getTeamPointDifferential(teamId);
                          const newPD = currentPD + 1;
                          try {
                            await updateTeamPointDifferential(teamId, newPD);
                          } catch (e) {
                            Alert.alert('Error', 'Failed to update point differential');
                          }
                        }}
                      >
                        <Ionicons name="add" size={20} color={NAVY} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Status Selection */}
                  <Text style={[s.label, { marginTop: 20, marginBottom: 12 }]}>Game Status</Text>
                  <View style={s.statusButtons}>
                    {GAME_STATUS_OPTIONS.map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          s.statusBtn,
                          editingGame?.status === status && s.statusBtnActive,
                        ]}
                        onPress={() =>
                          setEditingGame((prev) => (prev ? { ...prev, status } : null))
                        }
                      >
                        <Text
                          style={[
                            s.statusBtnText,
                            editingGame?.status === status && s.statusBtnTextActive,
                          ]}
                        >
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Score Editing */}
                  <Text style={[s.label, { marginTop: 20, marginBottom: 12 }]}>Scores</Text>
                  
                  <View style={s.scoreEditRow}>
                    <Text style={s.scoreTeamName}>{editingGame?.team1ID || 'Team 1'}</Text>
                    <View style={s.statEditControls}>
                      <TouchableOpacity
                        style={s.statEditBtn}
                        onPress={() =>
                          setEditingGame((prev) =>
                            prev
                              ? { ...prev, team1score: Math.max(0, prev.team1score - 1) }
                              : null
                          )
                        }
                      >
                        <Ionicons name="remove" size={20} color={NAVY} />
                      </TouchableOpacity>
                      <Text style={s.statEditValue}>{editingGame?.team1score || 0}</Text>
                      <TouchableOpacity
                        style={s.statEditBtn}
                        onPress={() =>
                          setEditingGame((prev) =>
                            prev ? { ...prev, team1score: prev.team1score + 1 } : null
                          )
                        }
                      >
                        <Ionicons name="add" size={20} color={NAVY} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={s.scoreEditRow}>
                    <Text style={s.scoreTeamName}>{editingGame?.team2ID || 'Team 2'}</Text>
                    <View style={s.statEditControls}>
                      <TouchableOpacity
                        style={s.statEditBtn}
                        onPress={() =>
                          setEditingGame((prev) =>
                            prev
                              ? { ...prev, team2score: Math.max(0, prev.team2score - 1) }
                              : null
                          )
                        }
                      >
                        <Ionicons name="remove" size={20} color={NAVY} />
                      </TouchableOpacity>
                      <Text style={s.statEditValue}>{editingGame?.team2score || 0}</Text>
                      <TouchableOpacity
                        style={s.statEditBtn}
                        onPress={() =>
                          setEditingGame((prev) =>
                            prev ? { ...prev, team2score: prev.team2score + 1 } : null
                          )
                        }
                      >
                        <Ionicons name="add" size={20} color={NAVY} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[s.bigBtn, { marginTop: 20, marginBottom: 20 }]}
                    onPress={handleSaveGame}
                    disabled={adminLoading}
                  >
                    <Ionicons name="save-outline" size={20} color={NAVY} />
                    <Text style={s.bigBtnText}>
                      {adminLoading ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </>
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: NAVY },
  scroll: { padding: 16, paddingTop: 24 },

  sheet: {
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: LINE,
    marginTop: 15,
    marginBottom: 30,
  },
  title: {
    color: YELLOW,
    fontWeight: '700',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: -10,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },

  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
  },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: CARD },

  infoCol: { flex: 1, minWidth: 0 },
  label: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
    opacity: 0.9,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
  value: { color: YELLOW, fontSize: 16, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  smallBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: YELLOW,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  avatarImg: { width: '100%', height: '100%' },
  smallBtnText: {
    color: NAVY,
    fontWeight: '900',
    fontSize: 12,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },

  field: { marginTop: 10 },
  editLabel: {
    color: TEXT,
    marginBottom: 6,
    fontWeight: '700',
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
  input: {
    backgroundColor: CARD,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 8 }),
    color: TEXT,
    fontFamily: FONT_FAMILIES.archivoNarrow,
    borderWidth: 1,
    borderColor: LINE,
  },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: {
    flex: 1,
    backgroundColor: YELLOW,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  supportText: {
    color: TEXT,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
  copyChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
    backgroundColor: '#082d54',
  },
  copyChipText: {
    color: YELLOW,
    fontWeight: '900',
    fontSize: 16,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
  copiedHint: { color: YELLOW, fontWeight: '800', marginTop: 8, textAlign: 'center' },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '92%',
    backgroundColor: NAVY,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.28)',
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseX: { position: 'absolute', top: 10, right: 10, padding: 6, zIndex: 10 },
  modalTitle: {
    color: YELLOW,
    fontWeight: '900',
    fontSize: 22,
    marginBottom: 14,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
  modalAvatarWrap: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    backgroundColor: NAVY,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.35)',
    marginBottom: 14,
  },
  modalAvatarImg: { width: '100%', height: '100%' },
  modalPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: CARD },

  bigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: YELLOW,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  bigBtnText: {
    color: NAVY,
    fontWeight: '900',
    fontSize: 16,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },

  settingsIcon: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    padding: 12,
    backgroundColor: CARD,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: LINE,
    zIndex: 10,
  },

  passwordInput: {
    width: '100%',
    backgroundColor: CARD,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: TEXT,
    fontFamily: FONT_FAMILIES.archivoNarrow,
    borderWidth: 1,
    borderColor: LINE,
    marginBottom: 16,
  },

  // Admin Panel Styles
  adminContainer: {
    flex: 1,
    backgroundColor: NAVY,
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  adminTitle: {
    color: YELLOW,
    fontSize: 24,
    fontWeight: '900',
    fontFamily: FONT_FAMILIES.archivoBlack,
  },

  adminTabs: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  adminTab: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: CARD,
    borderRadius: 10,
    alignItems: 'center',
  },
  adminTabActive: {
    backgroundColor: YELLOW,
  },
  adminTabText: {
    color: TEXT,
    fontWeight: '800',
    fontSize: 16,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
  adminTabTextActive: {
    color: NAVY,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    margin: 12,
    borderWidth: 1,
    borderColor: LINE,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 16,
    fontFamily: FONT_FAMILIES.archivoNarrow,
  },

  adminList: {
    flex: 1,
    padding: 12,
  },
  adminListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: LINE,
  },
  adminListName: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
  adminListSub: {
    color: TEXT,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
    fontFamily: FONT_FAMILIES.archivoNarrow,
  },

  adminEditContainer: {
    flex: 1,
    padding: 16,
  },
  adminEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  adminEditTitle: {
    color: YELLOW,
    fontSize: 20,
    fontWeight: '900',
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
  adminEditSubtitle: {
    color: TEXT,
    fontSize: 14,
    marginBottom: 4,
    fontFamily: FONT_FAMILIES.archivoNarrow,
  },

  statEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: LINE,
  },
  statEditName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
  statEditControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statEditBtn: {
    backgroundColor: YELLOW,
    borderRadius: 8,
    padding: 6,
  },
  statEditValue: {
    color: YELLOW,
    fontSize: 18,
    fontWeight: '900',
    minWidth: 40,
    textAlign: 'center',
    fontFamily: FONT_FAMILIES.archivoBlack,
  },

  gameTeamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  gameTeamBox: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
  },
  gameTeamLabel: {
    color: TEXT,
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
    fontFamily: FONT_FAMILIES.archivoNarrow,
  },
  gameTeamName: {
    color: YELLOW,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
  gameVs: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    marginHorizontal: 12,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },

  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: CARD,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LINE,
  },
  statusBtnActive: {
    backgroundColor: YELLOW,
    borderColor: YELLOW,
  },
  statusBtnText: {
    color: TEXT,
    fontWeight: '800',
    fontSize: 14,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
  statusBtnTextActive: {
    color: NAVY,
  },

  scoreEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: LINE,
  },
  scoreTeamName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },

  // Team ID and Record Styles
  teamIdContainer: {
    marginBottom: 16,
  },
  teamIdLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
  teamIdInput: {
    backgroundColor: CARD,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: TEXT,
    fontFamily: FONT_FAMILIES.archivoNarrow,
    borderWidth: 1,
    borderColor: LINE,
    fontSize: 14,
  },
  teamRecordContainer: {
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: LINE,
  },
  teamRecordLabel: {
    color: YELLOW,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
  recordRow: {
    flexDirection: 'row',
    gap: 12,
  },
  recordColumn: {
    flex: 1,
  },
  recordColumnLabel: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
});