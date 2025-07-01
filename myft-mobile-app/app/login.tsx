import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Page() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  return (
    <View>
      <TextInput placeholder="Username" value={username} onChangeText={setUsername} />
      <TextInput placeholder="Display Name" value={displayName} onChangeText={setDisplayName} />
      <Button
        title="Login"
        onPress={() => {
          login(username, displayName);
          router.replace('/');
        }}
      />
    </View>
  );
}