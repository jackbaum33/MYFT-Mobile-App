// fantasy/player/[id].tsx - thin wrapper so the Fantasy stack's Player route renders the
// screen shared with the Leaderboard and Team tabs (see screens/PlayerDetailScreen.tsx).
import React from 'react';
import { RouteProp, useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { FantasyStackParamList } from '../_layout';
import PlayerDetailScreen from '../../../screens/PlayerDetailScreen';

type PlayerScreenRouteProp = RouteProp<FantasyStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NavigationProp<FantasyStackParamList, 'Player'>;

export default function PlayerScreen() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  return <PlayerDetailScreen playerId={route.params.id} navigation={navigation} />;
}
