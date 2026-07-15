// screens/LeaguesScreen.tsx - list of leagues the signed-in user belongs to
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { listMyLeagues, type LeagueWithId } from '../../services/leagues';
import { FONT_FAMILIES } from '../../fonts';
import type { FantasyStackParamList } from '../(tabs)/fantasy/_layout';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.12)';

type NavProp = NavigationProp<FantasyStackParamList, 'FantasyIndex'>;

function statusLabel(status: LeagueWithId['status']): string {
  if (status === 'pending') return 'Not Started';
  if (status === 'drafting') return 'Drafting';
  return 'Complete';
}

function statusColor(status: LeagueWithId['status']): string {
  if (status === 'drafting') return '#4CAF50';
  if (status === 'complete') return '#9E9E9E';
  return YELLOW;
}

export default function LeaguesScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const [leagues, setLeagues] = useState<LeagueWithId[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.uid) {
      setLeagues([]);
      setLoading(false);
      return;
    }
    try {
      const list = await listMyLeagues(user.uid);
      setLeagues(list);
    } catch (e) {
      console.warn('[LeaguesScreen] listMyLeagues failed:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch every time the tab regains focus (e.g. coming back from creating a league).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={YELLOW} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateLeague')}>
        <Ionicons name="add-circle-outline" size={18} color={NAVY} />
        <Text style={styles.createBtnText}>Create League</Text>
      </TouchableOpacity>

      <FlatList
        data={leagues}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.empty}>You're not in any leagues yet. Create one to draft with friends!</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('LeagueDetail', { id: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.sub}>
                {item.memberUids.length} member{item.memberUids.length !== 1 ? 's' : ''} • {item.boysPerTeam} boys / {item.girlsPerTeam} girls
              </Text>
            </View>
            <Text style={[styles.status, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
            <Ionicons name="chevron-forward" size={18} color={TEXT} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, padding: 12 },
  center: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },

  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: YELLOW,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  createBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: LINE,
  },
  name: { color: TEXT, fontWeight: '800', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },
  sub: { color: TEXT, opacity: 0.75, fontSize: 12, marginTop: 4, fontFamily: FONT_FAMILIES.archivoNarrow },
  status: { fontWeight: '800', fontSize: 12, fontFamily: FONT_FAMILIES.archivoBlack },

  empty: { color: TEXT, opacity: 0.8, textAlign: 'center', marginTop: 40, fontFamily: FONT_FAMILIES.archivoNarrow },
});
