// app/screens/HomeScreen.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

// Colors
const NAVY = '#001F3F';
const CARD = '#07335f';
const YELLOW = '#FFD700';
const TEXT = '#E9ECEF';
const MUTED = '#A5B4C3';
const LINE = 'rgba(255,255,255,0.08)';

// Links
const WEBSITE_URL = 'https://www.themyft.com';
const INSTAGRAM_URL = 'https://www.instagram.com/myft.25/';
const PHOTOS_URL = 'https://drive.google.com/drive/u/1/folders/1oKW8z7r-OTg8ANJswUAz7qVBn-gIfl3v';

type ScheduleItem = {
  id: string;
  date: string | Date;   // ISO string or Date
  title: string;
  location: string;
};

/** Replace with your real events */
const SCHEDULE: ScheduleItem[] = [
  { id: 'evt-1', date: '2025-08-28T09:00:00', title: 'Opening Ceremony', location: 'Main Field' },
  { id: 'evt-2', date: '2025-08-28T10:00:00', title: 'Group Stage – Round 1', location: 'Fields A–D' },
  { id: 'evt-3', date: '2025-08-28T14:00:00', title: 'Skills Challenge', location: 'Field B' },
  { id: 'evt-4', date: '2025-08-29T09:00:00', title: 'Group Stage – Round 2', location: 'Fields A–D' },
  { id: 'evt-5', date: '2025-08-29T15:30:00', title: 'Quarterfinals', location: 'Main Field' },
  { id: 'evt-6', date: '2025-08-30T11:00:00', title: 'Semifinals', location: 'Main Field' },
  { id: 'evt-7', date: '2025-08-30T15:00:00', title: 'Championship Game', location: 'Main Field' },
  { id: 'evt-8', date: '2025-08-30T17:00:00', title: 'Awards & Closing', location: 'Main Stage' },
];

export default function HomeScreen() {
  const sections = useMemo(() => {
    // Normalize, sort, group by YYYY-MM-DD
    const normalized = SCHEDULE
      .map(it => ({ ...it, when: new Date(it.date) }))
      .sort((a, b) => a.when.getTime() - b.when.getTime());

    const byDay = new Map<string, typeof normalized>();
    for (const it of normalized) {
      const y = it.when.getFullYear();
      const m = String(it.when.getMonth() + 1).padStart(2, '0');
      const d = String(it.when.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${d}`;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(it);
    }

    // Build SectionList sections
    return Array.from(byDay.entries()).map(([key, items]) => {
      const sample = items[0].when;
      const title = sample.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      return {
        key,
        title,
        data: items,
      };
    });
  }, []);

  const open = async (url: string) => {
    try { await Linking.openURL(url); } catch {}
  };

  const renderItem = ({ item }: any) => {
    const time = item.when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return (
      <View style={s.card}>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={2}>{item.title}</Text>
          <Text style={s.meta} numberOfLines={1}>{time} • {item.location}</Text>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: any) => (
    <View style={s.sectionHeader}>
      <Text style={s.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  return (
    <View style={s.outer}>
      {/* Header */}
      <View style={s.headerWrap}>
        <Text style={s.header}>Welcome to the offical MYFT App!</Text>
        <Text style={s.sub}>Browse teams and players, view game schedule, set a personalized fantasy football roster, and more!</Text>
      </View>

      <View style={s.headerWrap}>
        <Text style={s.scheduleHeader}>Tournament Schedule</Text>
      </View>

      {/* Schedule */}
      <SectionList
        sections={sections}
        keyExtractor={(item: any) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        ItemSeparatorComponent={() => <View style={s.sep} />}
        SectionSeparatorComponent={() => <View style={s.sectionSep} />}
        contentContainerStyle={s.listPad}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom link buttons */}
      <View style={s.footer}>
        <TouchableOpacity style={s.iconCard} onPress={() => open(WEBSITE_URL)}>
          <Ionicons name="globe-outline" size={24} color={YELLOW} />
          <Text style={s.iconLabel}>Website</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.iconCard} onPress={() => open(INSTAGRAM_URL)}>
          <FontAwesome5 name="instagram" size={22} color={YELLOW} />
          <Text style={s.iconLabel}>Instagram</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.iconCard} onPress={() => open(PHOTOS_URL)}>
          <MaterialIcons name="photo-library" size={24} color={YELLOW} />
          <Text style={s.iconLabel}>Photos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: NAVY },

  headerWrap: { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 8 },
  header: { color: YELLOW, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  sub: { color: TEXT, opacity: 0.85, fontSize: 13, textAlign: 'center', marginTop: 6 },
  scheduleHeader: {color: YELLOW, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 15},
  listPad: { paddingHorizontal: 16, paddingBottom: 16 },

  sectionHeader: {
    backgroundColor: NAVY,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  sectionHeaderText: {
    color: YELLOW,
    fontWeight: '900',
    fontSize: 16,
  },

  sectionSep: { height: 4 },
  sep: { height: 10 },

  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: LINE,
  },
  title: { color: TEXT, fontSize: 16, fontWeight: '800' },
  meta: { color: MUTED, fontSize: 12, marginTop: 4 },

  // Footer with link buttons
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: LINE,
    backgroundColor: '#062a4e',
  },
  iconCard: {
    flex: 1,
    backgroundColor: '#0b3c70',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.18)',
  },
  iconLabel: {
    color: TEXT,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
