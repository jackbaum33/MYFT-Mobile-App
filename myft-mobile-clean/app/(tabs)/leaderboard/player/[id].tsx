// leaderboard/player/[id].tsx - thin wrapper so the Leaderboard stack's Player route renders
// the screen shared with the Fantasy and Team tabs (see screens/PlayerDetailScreen.tsx).
import React from 'react';
import { RouteProp, useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import PlayerDetailScreen from '../../../screens/PlayerDetailScreen';

export type LeaderboardStackParamList = {
  LeaderboardIndex: undefined;
  Player: { id: string };
  User: { id: string };
};

type PlayerScreenRouteProp = RouteProp<LeaderboardStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NavigationProp<LeaderboardStackParamList, 'Player'>;

export default function PlayerLeaderboardDetail() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  return <PlayerDetailScreen playerId={route.params.id} navigation={navigation} />;
}
