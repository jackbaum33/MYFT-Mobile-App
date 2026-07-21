// app/signin.tsx
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
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { FONT_FAMILIES } from '../fonts';
import type { RootStackParamList } from './_layout';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.2)';

const LOGO = require('../images/MYFT_LOGO.png');

const WRONG_CREDENTIAL_CODES = new Set([
  'auth/invalid-credential',
  'auth/wrong-password',
  'auth/user-not-found',
]);

export default function SignIn() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'SignIn'>>();
  const { signInWithEmail, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }

    setBusy(true);
    try {
      await signInWithEmail(email.trim(), password);
      // The auth state listener in _layout.tsx handles navigation automatically.
    } catch (e: any) {
      if (WRONG_CREDENTIAL_CODES.has(e?.code)) {
        Alert.alert('Sign-in failed', 'Incorrect email or password. Please try again.');
      } else if (e?.code === 'auth/invalid-email') {
        Alert.alert('Invalid email', 'Please enter a valid email address.');
      } else if (e?.code === 'auth/too-many-requests') {
        Alert.alert('Too many attempts', 'Please wait a bit and try again.');
      } else {
        Alert.alert('Sign-in failed', e?.message ?? 'Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Type your email above first, then tap "Forgot password?".');
      return;
    }
    try {
      await resetPassword(email.trim());
    } catch (e: any) {
      if (e?.code === 'auth/invalid-email') {
        Alert.alert('Invalid email', 'Please enter a valid email address.');
        return;
      }
      // Don't surface auth/user-not-found or anything else — avoid leaking
      // whether an account exists for this email.
    }
    Alert.alert('Check your email', "If that email is registered, we've sent a password reset link.");
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

        <Text style={s.header}>Welcome back!</Text>

        <View style={s.card}>
          <Text style={s.title}>Sign In</Text>
          <Text style={s.sub}>Sign in with the email and password you set up.</Text>

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

          <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
            <Text style={s.linkText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btn, busy && { opacity: 0.8 }]}
            onPress={handleSignIn}
            disabled={busy}
            activeOpacity={0.9}
          >
            {busy ? <ActivityIndicator color={NAVY} /> : <Text style={s.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
            <Text style={s.linkText}>New here? Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    marginBottom: 15,
  },
  title: {
    color: YELLOW,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: FONT_FAMILIES.archivoBlack,
  },
  sub: {
    color: TEXT,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: FONT_FAMILIES.archivoNarrow,
  },

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
    fontFamily: FONT_FAMILIES.archivoBlack,
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
