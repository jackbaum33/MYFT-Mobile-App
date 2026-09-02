// fantasy/_layout.tsx - Fantasy Stack Navigator
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FantasyIndexScreen from './index';
import PlayerScreen from './player/[id]';
import LeagueDetailScreen from '../../screens/LeagueDetailScreen';
import CreateLeagueScreen from '../../screens/CreateLeagueScreen';
import EditLeagueScreen from '../../screens/EditLeagueScreen';
import DraftRoomScreen from '../../screens/DraftRoomScreen';
import TeamRosterScreen from '../../screens/TeamRosterScreen';

export type FantasyStackParamList = {
  FantasyIndex: undefined;
  Player: { id: string };
  LeagueDetail: { id: string };
  CreateLeague: undefined;
  EditLeague: { id: string };
  DraftRoom: { id: string };
  TeamRoster: { id: string; uid: string };
};

const Stack = createNativeStackNavigator<FantasyStackParamList>();

export default function FantasyLayout() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#00274C', // Your NAVY color
        },
        headerTintColor: '#FFCB05', // Your YELLOW color
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="FantasyIndex"
        component={FantasyIndexScreen}
        options={{
          title: 'Fantasy',
          headerShown: true
        }}
      />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          title: 'Player Details',
          headerShown: true
        }}
      />
      <Stack.Screen
        name="LeagueDetail"
        component={LeagueDetailScreen}
        options={{ title: 'League', headerShown: true }}
      />
      <Stack.Screen
        name="CreateLeague"
        component={CreateLeagueScreen}
        options={{ title: 'Create League', headerShown: true }}
      />
      <Stack.Screen
        name="EditLeague"
        component={EditLeagueScreen}
        options={{ title: 'Edit League', headerShown: true }}
      />
      <Stack.Screen
        name="DraftRoom"
        component={DraftRoomScreen}
        options={{ title: 'Draft Room', headerShown: true }}
      />
      <Stack.Screen
        name="TeamRoster"
        component={TeamRosterScreen}
        options={{ title: 'Team Roster', headerShown: true }}
      />
    </Stack.Navigator>
  );
}