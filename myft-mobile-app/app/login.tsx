// login.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { createUserProfile, userExists } from '../services/users';
import { FONT_FAMILIES } from '@/assets/fonts';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.2)';

const DEFAULT_AVATAR = require('@/assets/images/default-avatar.png');
const LOGO = require('@/assets/images/MYFT_LOGO.png'); // <-- NEW

export default function Login() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const chooseFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }
  
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
  
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      aspect: [1, 1],
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const pickImage = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) takePhoto();
          else if (buttonIndex === 2) chooseFromLibrary();
        }
      );
    } else {
      Alert.alert('Select Photo', 'Choose a source', [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Library', onPress: chooseFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleContinue = async () => {
    if (!displayName.trim() || !username.trim()) {
      Alert.alert('Missing info', 'Please enter a display name and username.');
      return;
    }

    setBusy(true);
    try {
      let uid: string | null = auth.currentUser?.uid ?? null;
      if (!uid) {
        const cred = await signInAnonymously(auth);
        uid = cred.user.uid;
      }

      const exists = await userExists(uid!);
      if (!exists) {
        await createUserProfile({
          uid: uid!,
          displayName: displayName.trim(),
          username: username.trim(),
          photoUrl: photo || undefined,
        });
        
        // Wait for the profile to be created and verify it exists
        let retries = 0;
        const maxRetries = 10;
        while (retries < maxRetries) {
          const profileExists = await userExists(uid!);
          if (profileExists) break;
          await new Promise(resolve => setTimeout(resolve, 500));
          retries++;
        }
      }

      router.replace('/(tabs)' as any);
    } catch (e: any) {
      console.warn('[login] failed:', e);
      Alert.alert('Sign-in failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={s.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <Stack.Screen options={{ title: 'Welcome' }} />
      <ScrollView 
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* NEW: Logo above the header */}
        <Image source={LOGO} style={s.logo} resizeMode="contain" />

        <Text style={s.header}>Welcome to the MYFT App!</Text>

        <View style={s.card}>
          <Text style={s.title}>Create your profile</Text>
          <Text style={s.sub}>This is a one-time setup. You'll stay signed in.</Text>

          <TouchableOpacity style={s.avatar} onPress={pickImage} activeOpacity={0.9}>
            <Image
              source={photo ? { uri: photo } : DEFAULT_AVATAR}
              style={s.avatarImg}
            />
          </TouchableOpacity>
          <Text style={s.iconTitle}>Click icon to add or change photo!</Text>

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const AVATAR = 120;

const s = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: NAVY,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
    minHeight: '100%',
  },

  logo: {
    width: '70%',
    height: 150,
    alignSelf: 'center',
    marginBottom: 10,
    marginTop: -40,
  },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: LINE,
  },
  header: { 
    color: YELLOW, 
    fontSize: 24, 
    fontWeight: '900', 
    textAlign: 'center', 
    fontFamily: FONT_FAMILIES.archivoBlack, 
    marginBottom: 15
  },
  title: { 
    color: YELLOW, 
    fontSize: 20, 
    fontWeight: '900', 
    marginBottom: 6, 
    textAlign: 'center', 
    fontFamily: FONT_FAMILIES.archivoBlack 
  },
  iconTitle: { 
    color: YELLOW, 
    fontSize: 15, 
    fontWeight: '900', 
    marginBottom: 6, 
    textAlign: 'center', 
    fontFamily: FONT_FAMILIES.archivoBlack 
  },
  sub: { 
    color: TEXT, 
    opacity: 0.9, 
    textAlign: 'center', 
    marginBottom: 12, 
    fontFamily: FONT_FAMILIES.archivoNarrow 
  },

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
  btnText: { 
    color: NAVY, 
    fontWeight: '900', 
    fontFamily: FONT_FAMILIES.archivoBlack 
  },
});
