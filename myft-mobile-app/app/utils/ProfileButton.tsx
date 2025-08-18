// app/components/ProfileButton.tsx
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const YELLOW = '#FFD700';

export default function ProfileButton() {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push('/(modals)/profile')}
      style={{ paddingRight: 14, paddingLeft: 8 }}
      hitSlop={8}
      accessibilityLabel="Open profile"
    >
      <Ionicons name="person-circle-outline" size={28} color={YELLOW} />
    </TouchableOpacity>
  );
}
