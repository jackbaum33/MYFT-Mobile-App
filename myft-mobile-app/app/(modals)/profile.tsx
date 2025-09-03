// app/(tabs)/profile.tsx
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
} from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { FONT_FAMILIES } from '@/assets/fonts';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import { auth } from '@/services/firebaseConfig';
import { storage } from '@/services/firebaseConfig';
import { ref, uploadBytes, getDownloadURL /*, deleteObject*/ } from 'firebase/storage';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.25)';
const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');

export default function ProfileScreen() {
  const { user, updateUser, refreshUser } = useAuth(); // Added refreshUser

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

  // Loading state
  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Profile',
            headerStyle: { backgroundColor: NAVY },
            headerTintColor: YELLOW,
            headerTitleStyle: { color: YELLOW, fontWeight: 'bold' },
          }}
        />
        <View style={[s.outer, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={YELLOW} />
          <Text style={[s.value, { marginTop: 16 }]}>Loading profile...</Text>
        </View>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Profile',
            headerStyle: { backgroundColor: NAVY },
            headerTintColor: YELLOW,
            headerTitleStyle: { color: YELLOW, fontWeight: 'bold' },
          }}
        />
        <View style={[s.outer, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
          <Text style={[s.value, { color: '#ff6b6b', textAlign: 'center', marginBottom: 16 }]}>
            Error: {error}
          </Text>
          <TouchableOpacity style={s.actionBtn} onPress={loadUserData}>
            <Text style={s.actionText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerStyle: { backgroundColor: NAVY },
          headerTintColor: YELLOW,
          headerTitleStyle: { color: YELLOW, fontWeight: 'bold' },
        }}
      />
      <TouchableOpacity style={s.modalCloseX} onPress={() => router.back()}>
        <Ionicons name="close" size={26} color={TEXT} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={s.outer}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
      >
        <ScrollView contentContainerStyle={s.scroll} bounces={false}>
          <Text style={s.title}>My Profile</Text>
          <View style={s.sheet}>
            <View style={s.avatarRow}>
              <TouchableOpacity onPress={() => setAvatarOpen(true)} activeOpacity={0.8}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={s.avatar} />
                ) : (
                  <View style={[s.avatar, s.avatarPlaceholder]}>
                    <Image
                      source={DEFAULT_AVATAR}
                      style={s.avatarImg}
                    />
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
              {/* X button in corner */}
              <TouchableOpacity style={s.modalCloseX} onPress={() => setAvatarOpen(false)}>
                <Ionicons name="close" size={26} color={TEXT} />
              </TouchableOpacity>

              <Text style={s.modalTitle}>Profile Photo</Text>

              <View style={s.modalAvatarWrap}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={s.modalAvatarImg} />
                ) : (
                  <View style={[s.modalAvatarImg, s.modalPlaceholder]}>
                    <Image
                      source={DEFAULT_AVATAR}
                      style={s.avatarImg}
                    />
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
      </KeyboardAvoidingView>
    </>
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
  title: { color: YELLOW, fontWeight: '700', fontSize: 17, textAlign: 'center', marginBottom: 20, marginTop: -10, fontFamily: FONT_FAMILIES.archivoBlack },

  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 1, borderColor: 'rgba(255,215,0,0.35)' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: CARD },

  infoCol: { flex: 1, minWidth: 0 },
  label: { color: TEXT, fontSize: 12, fontWeight: '700', marginBottom: 2, opacity: 0.9, fontFamily: FONT_FAMILIES.archivoBlack},
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
  smallBtnText: { color: NAVY, fontWeight: '900', fontSize: 12, fontFamily: FONT_FAMILIES.archivoBlack},

  field: { marginTop: 10 },
  editLabel: { color: TEXT, marginBottom: 6, fontWeight: '700',fontFamily: FONT_FAMILIES.archivoBlack},
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
  actionBtn: { flex: 1, backgroundColor: YELLOW, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  actionText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  supportText: { color: TEXT, fontSize: 13, textAlign: 'center', marginBottom: 10, fontFamily: FONT_FAMILIES.archivoBlack},
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
  copyChipText: { color: YELLOW, fontWeight: '900', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },
  copiedHint: { color: YELLOW, fontWeight: '800', marginTop: 8, textAlign: 'center' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
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
  modalTitle: { color: YELLOW, fontWeight: '900', fontSize: 22, marginBottom: 14, fontFamily: FONT_FAMILIES.archivoBlack },
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
  bigBtnText: { color: NAVY, fontWeight: '900', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack},
});