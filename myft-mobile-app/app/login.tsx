import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { createUserProfile, userExists } from '../services/users';
import { FONT_FAMILIES } from '@/assets/fonts';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.2)';

export default function Login() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Pick image
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
    if (!displayName.trim() || !username.trim()) {
      Alert.alert('Missing info', 'Please enter a display name and username.');
      return;
    }

    setBusy(true);
    try {
      // Ensure we have an auth user (anonymous is fine)
      let uid: string | null = auth.currentUser?.uid ?? null;
      if (!uid) {
        const cred = await signInAnonymously(auth);
        uid = cred.user.uid;
      }

      // If this uid already has a profile, skip creation and go home
      const exists = await userExists(uid!);
      if (!exists) {
        await createUserProfile({
          uid: uid!,
          displayName: displayName.trim(),
          username: username.trim(),
          photoUri: photo ?? undefined,
        });
      }

      // Go to tabs root
      router.replace('/');
    } catch (e: any) {
      console.warn('[login] failed:', e);
      Alert.alert('Sign-in failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'Welcome' }} />

      <View style={s.card}>
        <Text style={s.title}>Create your profile</Text>
        <Text style={s.sub}>This is a one-time setup. You’ll stay signed in.</Text>

        <TouchableOpacity style={s.avatar} onPress={pickImage} activeOpacity={0.9}>
          {photo ? (
            <Image source={{ uri: photo }} style={s.avatarImg} />
          ) : (
            <Text style={s.avatarHint}>Tap to add photo</Text>
          )}
        </TouchableOpacity>

        <TextInput
          placeholder="Display name"
          placeholderTextColor="#c9d6e2"
          value={displayName}
          onChangeText={setDisplayName}
          style={s.input}
        />
        <TextInput
          placeholder="Username"
          placeholderTextColor="#c9d6e2"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
          style={s.input}
        />

        <TouchableOpacity
          style={[s.btn, busy && { opacity: 0.8 }]}
          onPress={handleContinue}
          disabled={busy}
          activeOpacity={0.9}
        >
          {busy ? <ActivityIndicator color={NAVY} /> : <Text style={s.btnText}>Save & Continue</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const AVATAR = 120;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 16, justifyContent: 'center' },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: LINE,
  },
  title: { color: YELLOW, fontSize: 20, fontWeight: '900', marginBottom: 6, textAlign: 'center', fontFamily: FONT_FAMILIES.archivoBlack },
  sub: { color: TEXT, opacity: 0.9, textAlign: 'center', marginBottom: 12, fontFamily: FONT_FAMILIES.archivoNarrow },

  avatar: {
    alignSelf: 'center',
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    backgroundColor: NAVY,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarHint: { color: TEXT, opacity: 0.7, fontFamily: FONT_FAMILIES.archivoNarrow },

  input: {
    color: YELLOW,
    backgroundColor: '#0a3a68',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.18)',
    fontFamily: FONT_FAMILIES.archivoBlack,
  },

  btn: {
    backgroundColor: YELLOW,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  btnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },
});
