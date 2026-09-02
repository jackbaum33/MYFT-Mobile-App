// screens/LeagueDetailScreen.tsx - league overview: pending (start draft) / drafting / complete (standings)
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTournament } from '../../context/TournamentContext';
import { listUsers, type UserProfile } from '../../services/users';
import { mapPlayersById, rosterTotalPoints } from '../../utils/fantasy';
import {
  subscribeToLeague,
  subscribeToRosters,
  startDraft,
  deleteLeague,
  type LeagueWithId,
  type LeagueRoster,
} from '../../services/leagues';
import { FONT_FAMILIES } from '../../fonts';
import type { FantasyStackParamList } from '../(tabs)/fantasy/_layout';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.12)';

type NavProp = NavigationProp<FantasyStackParamList, 'LeagueDetail'>;
type RouteProp_ = RouteProp<FantasyStackParamList, 'LeagueDetail'>;

export default function LeagueDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp_>();
  const { id: leagueId } = route.params;
  const { user } = useAuth();
  const { teams, calculatePoints } = useTournament();

  const [league, setLeague] = useState<LeagueWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [rosters, setRosters] = useState<LeagueRoster[]>([]);
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const unsub = subscribeToLeague(leagueId, (l) => {
      setLeague(l);
      setLoading(false);
    });
    return unsub;
  }, [leagueId]);

  useEffect(() => {
    const unsub = subscribeToRosters(leagueId, setRosters);
    return unsub;
  }, [leagueId]);

  useEffect(() => {
    listUsers().then(setUsers).catch((e) => console.warn('[LeagueDetail] listUsers failed:', e));
  }, []);

  // Tick every 30s so the Start Draft gate re-evaluates without a manual refresh.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const usersByUid = useMemo(() => new Map(users.map((u) => [u.uid, u])), [users]);
  const playersById = useMemo(() => mapPlayersById(teams.flatMap((t) => t.players)), [teams]);

  const isOwner = !!user?.uid && league?.ownerUid === user.uid;
  // Owners can jump the scheduled start time; everyone else still waits for it.
  const canStart = !!league && (isOwner || now >= league.scheduledStart.toMillis());

  const onStartDraft = async () => {
    if (!league) return;
    try {
      setStarting(true);
      await startDraft(leagueId, league);
    } catch (e: any) {
      console.warn('[LeagueDetail] startDraft failed:', e);
      Alert.alert('Failed to start draft', e?.message ?? 'Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const onDeleteLeague = () => {
    Alert.alert(
      'Delete League',
      `Delete "${league?.name ?? 'this league'}" permanently? This removes all rosters and picks and can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteLeague(leagueId);
              navigation.goBack();
            } catch (e: any) {
              console.warn('[LeagueDetail] deleteLeague failed:', e);
              Alert.alert('Failed to delete league', e?.message ?? 'Please try again.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const standings = useMemo(() => {
    return rosters
      .map((r) => ({
        uid: r.uid,
        displayName: usersByUid.get(r.uid)?.displayName ?? r.uid,
        points: rosterTotalPoints([...(r.boys ?? []), ...(r.girls ?? [])], playersById, calculatePoints),
      }))
      .sort((a, b) => b.points - a.points);
  }, [rosters, usersByUid, playersById, calculatePoints]);

  if (loading || !league) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={YELLOW} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
      data={league.status === 'complete' ? standings : []}
      keyExtractor={(s) => s.uid}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>{league.name}</Text>
          <View style={styles.card}>
            <Text style={styles.metaLine}>
              {league.boysPerTeam} boys / {league.girlsPerTeam} girls per team • {league.draftStyle === 'snake' ? 'Snake' : 'Normal'} draft
            </Text>
            <Text style={styles.metaLine}>
              Scheduled start: {league.scheduledStart.toDate().toLocaleString()}
            </Text>
            <Text style={styles.metaLine}>
              {league.memberUids.length} member{league.memberUids.length !== 1 ? 's' : ''}: {league.memberUids.map((uid) => usersByUid.get(uid)?.displayName ?? uid).join(', ')}
            </Text>
          </View>

          {league.status === 'pending' && (
            <View style={styles.card}>
              {isOwner ? (
                <>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.navigate('EditLeague', { id: leagueId })}
                  >
                    <Ionicons name="settings-outline" size={16} color={YELLOW} />
                    <Text style={styles.editBtnText}>Edit Settings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, (!canStart || starting) && styles.actionBtnDisabled]}
                    onPress={onStartDraft}
                    disabled={!canStart || starting}
                  >
                    <Text style={styles.actionBtnText}>{starting ? 'Starting…' : 'Start Draft'}</Text>
                  </TouchableOpacity>
                  {!canStart && (
                    <Text style={styles.helperText}>
                      Available at {league.scheduledStart.toDate().toLocaleString()}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.helperText}>
                  Waiting for the owner to start the draft (scheduled for {league.scheduledStart.toDate().toLocaleString()}).
                </Text>
              )}
            </View>
          )}

          {league.status === 'drafting' && (
            <View style={styles.card}>
              <Text style={styles.metaLine}>Draft in progress</Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('DraftRoom', { id: leagueId })}
              >
                <Text style={styles.actionBtnText}>Enter Draft Room</Text>
              </TouchableOpacity>
            </View>
          )}

          {league.status === 'complete' && <Text style={styles.sectionLabel}>Final Standings</Text>}

          {isOwner && (
            <TouchableOpacity
              style={[styles.deleteBtn, deleting && styles.actionBtnDisabled]}
              onPress={onDeleteLeague}
              disabled={deleting}
            >
              <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
              <Text style={styles.deleteBtnText}>{deleting ? 'Deleting…' : 'Delete League'}</Text>
            </TouchableOpacity>
          )}
        </View>
      }
      renderItem={({ item, index }) => (
        <TouchableOpacity
          style={styles.standingRow}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('TeamRoster', { id: leagueId, uid: item.uid })}
        >
          <Text style={styles.rank}>{index + 1}.</Text>
          <Text style={styles.standingName} numberOfLines={1}>{item.displayName}</Text>
          <Text style={styles.standingPoints}>{item.points} <Text style={styles.standingPointsUnit}>pts</Text></Text>
          <Ionicons name="chevron-forward" size={16} color={TEXT} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  center: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },

  title: { color: YELLOW, fontSize: 22, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack, marginBottom: 12 },

  card: { backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: LINE, marginBottom: 12 },
  metaLine: { color: TEXT, fontSize: 13, marginBottom: 6, fontFamily: FONT_FAMILIES.archivoNarrow },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,203,5,0.4)',
  },
  editBtnText: { color: YELLOW, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },

  actionBtn: { backgroundColor: YELLOW, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },
  helperText: { color: TEXT, opacity: 0.75, fontSize: 12, marginTop: 8, fontFamily: FONT_FAMILIES.archivoNarrow },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.4)',
  },
  deleteBtnText: { color: '#ff6b6b', fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },

  sectionLabel: { color: YELLOW, fontWeight: '700', fontSize: 14, marginBottom: 8, fontFamily: FONT_FAMILIES.archivoBlack },

  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: LINE,
  },
  rank: { color: TEXT, opacity: 0.7, width: 24, fontFamily: FONT_FAMILIES.archivoBlack },
  standingName: { flex: 1, color: TEXT, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack },
  standingPoints: { color: YELLOW, fontWeight: '900', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },
  standingPointsUnit: { fontSize: 12, fontWeight: '700' },
});
