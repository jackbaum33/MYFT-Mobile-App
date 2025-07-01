import { useRouter } from 'expo-router';
import { View, Text, Button } from 'react-native';
import React from 'react';

const ProfileScreen = () => {
  const router = useRouter();

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20 }}>Profile Page</Text>
      <Button title="Go to Home" onPress={() => router.push('/(tabs)/team')} />
    </View>
  );
};

export default ProfileScreen;
