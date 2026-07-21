// login.tsx - Fixed without manual navigation
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
import { signInAnonymously } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth } from '../services/firebaseConfig';
import { createUserProfile, userExists } from '../services/users';
import { useAuth } from '../context/AuthContext';
import { FONT_FAMILIES } from '../fonts';
import type { RootStackParamList } from './_layout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.2)';

const DEFAULT_AVATAR = require('../images/default-avatar.png');
const LOGO = require('../images/MYFT_LOGO.png');

export default function Login() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Login'>>();
  const { linkEmailPassword } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    if (!displayName.trim() || !username.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing info', 'Please fill in every field.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords don’t match', 'Please make sure both passwords match.');
      return;
    }

    setBusy(true);
    try {
      console.log('🚀 Starting login process...');

      let uid: string | null = auth.currentUser?.uid ?? null;
      console.log('👤 Current user UID:', uid);

      if (!uid) {
        console.log('🔐 Signing in anonymously...');
        const cred = await signInAnonymously(auth);
        uid = cred.user.uid;
        console.log('✅ Anonymous sign-in successful, UID:', uid);
      }

      const exists = await userExists(uid!);
      console.log('📋 User profile exists:', exists);

      if (!exists) {
        console.log('🔗 Linking email/password...');
        try {
          await linkEmailPassword(email.trim(), password);
          console.log('✅ Email/password linked');
        } catch (linkError: any) {
          if (linkError?.code === 'auth/email-already-in-use') {
            Alert.alert(
              'Account already exists',
              'That email already has an account. Sign in instead?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign In', onPress: () => navigation.navigate('SignIn') },
              ]
            );
          } else if (linkError?.code === 'auth/weak-password') {
            Alert.alert('Weak password', 'Password must be at least 6 characters.');
          } else if (linkError?.code === 'auth/invalid-email') {
            Alert.alert('Invalid email', 'Please enter a valid email address.');
          } else {
            Alert.alert('Sign-in failed', linkError?.message ?? 'Please try again.');
          }
          return;
        }

        console.log('🏗️ Creating user profile...');
        await createUserProfile({
          uid: uid!,
          displayName: displayName.trim(),
          username: username.trim(),
          photoUrl: photo || undefined,
          email: email.trim(),
        });
        console.log('✅ User profile created');
        
        // Wait for the profile to be created and verify it exists
        let retries = 0;
        const maxRetries = 10;
        while (retries < maxRetries) {
          const profileExists = await userExists(uid!);
          console.log(`🔄 Profile check attempt ${retries + 1}: ${profileExists}`);
          if (profileExists) break;
          await new Promise(resolve => setTimeout(resolve, 500));
          retries++;
        }
        
        if (retries >= maxRetries) {
          console.warn('⚠️ Profile verification timed out');
        } else {
          console.log('✅ Profile verification successful');
          
          // Trigger a manual refresh of the auth state to check the new profile
          if ((global as any).refreshUserProfile) {
            console.log('🔄 Triggering profile refresh...');
            await (global as any).refreshUserProfile();
          }
        }
      }

      console.log('🎉 Login process completed');
      
      // The auth state change listener in _layout.tsx will automatically
      // navigate to the main app once authentication and profile are verified
      // No manual navigation needed here
      
    } catch (e: any) {
      console.warn('❌ Login failed:', e);
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
      <ScrollView 
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
          <TextInput
            placeholder="Email"
            placeholderTextColor="#c9d6e2"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={s.input}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#c9d6e2"
            autoCapitalize="none"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={s.input}
          />
          <TextInput
            placeholder="Confirm password"
            placeholderTextColor="#c9d6e2"
            autoCapitalize="none"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={s.input}
          />
          <Text style={s.hint}>Used to sign back in if you lose this device.</Text>

          <TouchableOpacity
            style={[s.btn, busy && { opacity: 0.8 }]}
            onPress={handleContinue}
            disabled={busy}
            activeOpacity={0.9}
          >
            {busy ? <ActivityIndicator color={NAVY} /> : <Text style={s.btnText}>Save & Continue</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('SignIn')} activeOpacity={0.7}>
            <Text style={s.linkText}>Already have an account? Sign In</Text>
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

  hint: {
    color: TEXT,
    opacity: 0.8,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    marginTop: -4,
    fontFamily: FONT_FAMILIES.archivoNarrow,
  },
  linkText: {
    color: YELLOW,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 14,
    textDecorationLine: 'underline',
    fontFamily: FONT_FAMILIES.archivoNarrow,
  },
});