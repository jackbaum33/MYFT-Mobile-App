import { useRouter } from 'expo-router';
import { View, Text, Button } from 'react-native';
import React from 'react';

const ProfileScreen = () => {
  const router = useRouter();

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20 }}>Profile Page</Text>
    </View>
  );
};

export default ProfileScreen;
