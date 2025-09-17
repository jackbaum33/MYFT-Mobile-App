// fantasy/player/[id].tsx - Player Detail Screen
import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp, useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { FantasyStackParamList } from '../_layout';

type PlayerScreenRouteProp = RouteProp<FantasyStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NavigationProp<FantasyStackParamList, 'Player'>;

export default function PlayerScreen() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const { id } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `Player ${id}`, // You can customize this based on actual player data
    });
  }, [navigation, id]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Player ID: {id}</Text>
      {/* Add your player detail content here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00274C', // Your NAVY color
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#E9ECEF', // Your TEXT color
    fontSize: 18,
    fontWeight: 'bold',
  },
});