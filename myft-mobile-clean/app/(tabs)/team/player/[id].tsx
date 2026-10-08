// team/player/[id].tsx - thin wrapper so the Team stack's Player route renders the screen
// shared with the Fantasy and Leaderboard tabs (see screens/PlayerDetailScreen.tsx).
import React from 'react';
import { RouteProp, useRoute, useNavigation, NavigationProp } from '@react-navigation/native';
import { TeamStackParamList } from '../_layout';
import PlayerDetailScreen from '../../../screens/PlayerDetailScreen';

type PlayerScreenRouteProp = RouteProp<TeamStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NavigationProp<TeamStackParamList, 'Player'>;

export default function PlayerTeamDetail() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  return <PlayerDetailScreen playerId={route.params.id} navigation={navigation} />;
}
