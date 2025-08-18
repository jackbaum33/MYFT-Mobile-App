// app/components/ProfileButton.tsx
import React from 'react';
import { TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

const YELLOW = '#FFD700';

export default function ProfileButton() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <TouchableOpacity
      onPress={() => router.push('/(modals)/profile')}
      style={{ paddingRight: 14, paddingLeft: 8 }}
      hitSlop={8}
      accessibilityLabel="Open profile"
    >
      {user?.photoUri ? (
        <Image
          source={{ uri: user.photoUri }}
          style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,215,0,0.35)' }}
        />
      ) : (
        <Ionicons name="person-circle-outline" size={26} color={YELLOW} />
      )}
    </TouchableOpacity>
  );
}
