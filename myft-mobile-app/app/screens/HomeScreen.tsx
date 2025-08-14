// app/screens/HomeScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Linking,
  Modal,
  Pressable,
  Platform,
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
  location: string;      // short label shown in the list
  address: string;       // full address for the modal + maps
};

/** Replace with your real events + addresses */
const SCHEDULE: ScheduleItem[] = [
  { id: 'evt-1', date: '2025-08-28T09:00:00', title: 'Opening Ceremony',           location: 'Main Field',  address: '123 Tournament Way, Cityville, NY 10001' },
  { id: 'evt-2', date: '2025-08-28T10:00:00', title: 'Group Stage – Round 1',      location: 'Fields A–D',  address: '200 Sports Complex Rd, Cityville, NY 10002' },
  { id: 'evt-3', date: '2025-08-28T14:00:00', title: 'Skills Challenge',           location: 'Field B',     address: '200 Sports Complex Rd, Cityville, NY 10002' },
  { id: 'evt-4', date: '2025-08-29T09:00:00', title: 'Group Stage – Round 2',      location: 'Fields A–D',  address: '200 Sports Complex Rd, Cityville, NY 10002' },
  { id: 'evt-5', date: '2025-08-29T15:30:00', title: 'Quarterfinals',              location: 'Main Field',  address: '123 Tournament Way, Cityville, NY 10001' },
  { id: 'evt-6', date: '2025-08-30T11:00:00', title: 'Semifinals',                 location: 'Main Field',  address: '123 Tournament Way, Cityville, NY 10001' },
  { id: 'evt-7', date: '2025-08-30T15:00:00', title: 'Championship Game',          location: 'Main Field',  address: '123 Tournament Way, Cityville, NY 10001' },
  { id: 'evt-8', date: '2025-08-30T17:00:00', title: 'Awards & Closing',           location: 'Main Stage',  address: '500 Celebration Ave, Cityville, NY 10003' },
];

export default function HomeScreen() {
  const [selected, setSelected] = useState<(ScheduleItem & { when: Date }) | null>(null);

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

  const openInMaps = (event: ScheduleItem & { when: Date }) => {
    const encoded = encodeURIComponent(event.address || `${event.location} ${event.title}`);
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${encoded}`,
      android: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    });
    if (url) open(url);
  };

  const renderItem = ({ item }: any) => {
    const time = item.when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return (
      <TouchableOpacity style={s.card} onPress={() => setSelected(item)} activeOpacity={0.85}>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={2}>{item.title}</Text>
          <Text style={s.meta} numberOfLines={1}>{time} • {item.location}</Text>
        </View>
      </TouchableOpacity>
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
        <Text style={s.header}>Welcome to the official MYFT 2025 App!</Text>
        <Text style={s.sub}>Browse teams and players, view schedule of games, set a personalized fantasy football roster, and more!</Text>
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

      {/* Event detail modal */}
<Modal
  visible={!!selected}
  transparent
  animationType="fade"
  onRequestClose={() => setSelected(null)}
>
  <Pressable
    style={s.modalBackdrop}
    onPress={() => setSelected(null)} // tap anywhere outside closes
  >
    <Pressable
      style={s.modalCard}
      onPress={(e) => e.stopPropagation()} // prevent closing if tapping inside the card
    >
      {selected && (
        <>
          <Text style={s.modalTitle}>{selected.title}</Text>
          <Text style={s.modalMeta}>
            {selected.when.toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>

          <View style={s.addrBox}>
            <Ionicons name="location-outline" size={18} color={YELLOW} />
            <Text style={s.addrText}>{selected.address}</Text>
          </View>

          <TouchableOpacity style={s.mapsBtn} onPress={() => openInMaps(selected)}>
            <Ionicons name="navigate-outline" size={18} color={NAVY} />
            <Text style={s.mapsBtnText}>Open in Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.closeBtn} onPress={() => setSelected(null)}>
            <Text style={s.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </>
      )}
    </Pressable>
  </Pressable>
</Modal>
</View>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, backgroundColor: NAVY },

  headerWrap: { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 8 },
  header: { color: YELLOW, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  sub: { color: TEXT, opacity: 0.85, fontSize: 13, textAlign: 'center', marginTop: 6 },
  scheduleHeader: { color: YELLOW, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 15 },

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

  // Modal (no map; address + open button)
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    width: '88%',
    backgroundColor: NAVY,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
  },
  modalTitle: { color: YELLOW, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  modalMeta: { color: TEXT, fontSize: 13, marginTop: 6, marginBottom: 10 },
  addrBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  addrText: { color: TEXT, fontSize: 13, textAlign: 'center' },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: YELLOW,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  mapsBtnText: { color: NAVY, fontWeight: '900' },
  closeBtn: { paddingVertical: 8, paddingHorizontal: 10 },
  closeBtnText: { color: TEXT, fontWeight: '700' },
});
