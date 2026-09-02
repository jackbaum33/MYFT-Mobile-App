// screens/EditLeagueScreen.tsx - owner-only editor for a pending league's settings
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTournament } from '../../context/TournamentContext';
import { listUsers, type UserProfile } from '../../services/users';
import { subscribeToLeague, updateLeagueSettings, type DraftStyle, type LeagueWithId } from '../../services/leagues';
import { FONT_FAMILIES } from '../../fonts';
import type { FantasyStackParamList } from '../(tabs)/fantasy/_layout';

const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const LINE = 'rgba(255,255,255,0.12)';

type NavProp = NavigationProp<FantasyStackParamList, 'EditLeague'>;
type RouteProp_ = RouteProp<FantasyStackParamList, 'EditLeague'>;

function Stepper({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity style={styles.stepperBtn} onPress={() => onChange(Math.max(min, value - 1))}>
          <Ionicons name="remove" size={18} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity style={styles.stepperBtn} onPress={() => onChange(value + 1)}>
          <Ionicons name="add" size={18} color={NAVY} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function EditLeagueScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp_>();
  const { id: leagueId } = route.params;
  const { user } = useAuth();
  const { teams } = useTournament();

  const [league, setLeague] = useState<LeagueWithId | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [boysPerTeam, setBoysPerTeam] = useState(4);
  const [girlsPerTeam, setGirlsPerTeam] = useState(2);
  const [draftStyle, setDraftStyle] = useState<DraftStyle>('snake');
  const [scheduledStart, setScheduledStart] = useState(() => new Date());
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = subscribeToLeague(leagueId, (l) => {
      setLeague(l);
      setLoading(false);
    });
    return unsub;
  }, [leagueId]);

  // Hydrate form fields once, the first time the league doc arrives.
  useEffect(() => {
    if (hydrated || !league) return;
    setName(league.name);
    setSelectedUids(new Set(league.memberUids));
    setBoysPerTeam(league.boysPerTeam);
    setGirlsPerTeam(league.girlsPerTeam);
    setDraftStyle(league.draftStyle);
    setScheduledStart(league.scheduledStart.toDate());
    setHydrated(true);
  }, [league, hydrated]);

  useEffect(() => {
    (async () => {
      try {
        const list = await listUsers();
        setAllUsers(list);
      } catch (e) {
        console.warn('[EditLeague] listUsers failed:', e);
      } finally {
        setUsersLoaded(true);
      }
    })();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = q
      ? allUsers.filter((u) => u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
      : allUsers;
    return [...arr].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allUsers, search]);

  const totalBoysAvailable = useMemo(
    () => teams.filter((t) => t.division === 'boys').reduce((n, t) => n + t.players.length, 0),
    [teams]
  );
  const totalGirlsAvailable = useMemo(
    () => teams.filter((t) => t.division === 'girls').reduce((n, t) => n + t.players.length, 0),
    [teams]
  );

  const toggleMember = (uid: string) => {
    if (uid === league?.ownerUid) return; // owner is always in
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const adjustDay = (delta: number) => {
    setScheduledStart((prev) => new Date(prev.getTime() + delta * 24 * 60 * 60 * 1000));
  };
  const adjustMinutes = (delta: number) => {
    setScheduledStart((prev) => new Date(prev.getTime() + delta * 15 * 60 * 1000));
  };

  const memberCount = selectedUids.size;
  const rounds = boysPerTeam + girlsPerTeam;

  const onSubmit = async () => {
    if (!league) return;
    if (league.ownerUid !== user?.uid) {
      Alert.alert('Not allowed', 'Only the league owner can edit these settings.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your league a name.');
      return;
    }
    if (memberCount < 2) {
      Alert.alert('Not enough members', 'A league needs at least 2 members to draft.');
      return;
    }
    if (rounds < 1) {
      Alert.alert('Roster too small', 'Each team needs at least 1 boys or girls player.');
      return;
    }
    if (boysPerTeam * memberCount > totalBoysAvailable) {
      Alert.alert(
        'Not enough boys players',
        `${boysPerTeam} boys x ${memberCount} members needs ${boysPerTeam * memberCount} players, but only ${totalBoysAvailable} are available.`
      );
      return;
    }
    if (girlsPerTeam * memberCount > totalGirlsAvailable) {
      Alert.alert(
        'Not enough girls players',
        `${girlsPerTeam} girls x ${memberCount} members needs ${girlsPerTeam * memberCount} players, but only ${totalGirlsAvailable} are available.`
      );
      return;
    }

    try {
      setSubmitting(true);
      await updateLeagueSettings(leagueId, {
        name: name.trim(),
        memberUids: Array.from(selectedUids),
        boysPerTeam,
        girlsPerTeam,
        draftStyle,
        scheduledStart: Timestamp.fromDate(scheduledStart),
      });
      navigation.goBack();
    } catch (e: any) {
      console.warn('[EditLeague] updateLeagueSettings failed:', e);
      Alert.alert('Failed to save changes', e?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !league || !hydrated) {
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
      data={filteredUsers}
      keyExtractor={(u) => u.uid}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View>
          <Text style={styles.sectionLabel}>League Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. The Backyard League"
            placeholderTextColor={`${TEXT}80`}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.sectionLabel}>Roster Size</Text>
          <View style={styles.card}>
            <Stepper label="Boys per team" value={boysPerTeam} min={0} onChange={setBoysPerTeam} />
            <Stepper label="Girls per team" value={girlsPerTeam} min={0} onChange={setGirlsPerTeam} />
            <Text style={styles.helperText}>{rounds} round{rounds !== 1 ? 's' : ''} total</Text>
          </View>

          <Text style={styles.sectionLabel}>Draft Style</Text>
          <View style={styles.segWrap}>
            {(['snake', 'linear'] as const).map((style) => (
              <TouchableOpacity
                key={style}
                onPress={() => setDraftStyle(style)}
                style={[styles.segBtn, draftStyle === style && styles.segBtnActive]}
              >
                <Text style={[styles.segText, draftStyle === style && styles.segTextActive]}>
                  {style === 'snake' ? 'Snake' : 'Normal'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Scheduled Start</Text>
          <View style={styles.card}>
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => adjustDay(-1)}>
                <Ionicons name="chevron-back" size={18} color={NAVY} />
              </TouchableOpacity>
              <Text style={styles.dateText}>{scheduledStart.toLocaleDateString()}</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => adjustDay(1)}>
                <Ionicons name="chevron-forward" size={18} color={NAVY} />
              </TouchableOpacity>
            </View>
            <View style={styles.dateRow}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => adjustMinutes(-1)}>
                <Ionicons name="chevron-back" size={18} color={NAVY} />
              </TouchableOpacity>
              <Text style={styles.dateText}>
                {scheduledStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => adjustMinutes(1)}>
                <Ionicons name="chevron-forward" size={18} color={NAVY} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Members ({memberCount})</Text>
          <TextInput
            style={styles.input}
            placeholder="Search users..."
            placeholderTextColor={`${TEXT}80`}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {!usersLoaded && <ActivityIndicator color={YELLOW} style={{ marginTop: 12 }} />}
        </View>
      }
      renderItem={({ item }) => {
        const isOwner = item.uid === league.ownerUid;
        const isSelected = selectedUids.has(item.uid);
        return (
          <TouchableOpacity
            style={styles.userRow}
            activeOpacity={isOwner ? 1 : 0.8}
            onPress={() => toggleMember(item.uid)}
            disabled={isOwner}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{item.displayName}{isOwner ? ' (owner)' : ''}</Text>
              <Text style={styles.userSub}>@{item.username}</Text>
            </View>
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={isSelected ? YELLOW : TEXT}
            />
          </TouchableOpacity>
        );
      }}
      ListFooterComponent={
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={onSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>{submitting ? 'Saving…' : 'Save Changes'}</Text>
        </TouchableOpacity>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  center: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },

  sectionLabel: { color: YELLOW, fontWeight: '700', fontSize: 14, marginTop: 18, marginBottom: 8, fontFamily: FONT_FAMILIES.archivoBlack },

  input: {
    backgroundColor: CARD,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TEXT,
    fontFamily: FONT_FAMILIES.archivoNarrow,
    borderWidth: 1,
    borderColor: LINE,
  },

  card: { backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: LINE },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  stepperLabel: { color: TEXT, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoNarrow },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: { backgroundColor: YELLOW, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { color: TEXT, fontWeight: '900', fontSize: 16, minWidth: 24, textAlign: 'center', fontFamily: FONT_FAMILIES.archivoBlack },
  helperText: { color: TEXT, opacity: 0.7, fontSize: 12, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow },

  segWrap: { flexDirection: 'row', backgroundColor: '#07335f', borderRadius: 10, padding: 6, gap: 8 },
  segBtn: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  segBtnActive: { backgroundColor: YELLOW },
  segText: { color: YELLOW, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoBlack },
  segTextActive: { color: NAVY, fontFamily: FONT_FAMILIES.archivoBlack },

  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dateBtn: { backgroundColor: YELLOW, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dateText: { color: TEXT, fontWeight: '800', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: LINE,
  },
  userName: { color: TEXT, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoBlack },
  userSub: { color: TEXT, opacity: 0.7, fontSize: 12, marginTop: 2, fontFamily: FONT_FAMILIES.archivoNarrow },

  submitBtn: { backgroundColor: YELLOW, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: NAVY, fontWeight: '900', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack },
});
