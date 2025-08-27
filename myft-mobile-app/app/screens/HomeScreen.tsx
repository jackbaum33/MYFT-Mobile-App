// app/screens/HomeScreen.tsx
import React, { useMemo, useState, useCallback } from 'react';
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
  Image,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { FONT_FAMILIES } from '@/assets/fonts';
import { pics } from '../../assets/images/board_pictures';

// Colors
const CARD = '#00417D';
const NAVY = '#00274C';
const YELLOW = '#FFCB05';
const TEXT = '#E9ECEF';
const MUTED = '#A5B4C3';
const LINE = 'rgba(255,255,255,0.08)';

// Links
const WEBSITE_URL = 'https://www.themyft.com';
const INSTAGRAM_URL = 'https://www.instagram.com/myft.25/';
const PHOTOS_URL = 'https://drive.google.com/drive/u/1/folders/1oKW8z7r-OTg8ANJswUAz7qVBn-gIfl3v';

type ScheduleItem = {
  id: string;
  date: string | Date;
  title: string;
  location: string;
  address: string;
};

const SCHEDULE: ScheduleItem[] = [
  { id: 'evt-1', date: '2025-08-28T09:00:00', title: 'Sam Lukashok',          location: 'Main Field',  address: '123 Tournament Way, Cityville, NY 10001' },
  { id: 'evt-2', date: '2025-08-28T10:00:00', title: 'Sam Lukashok – Round 1',location: 'Fields A–D',  address: '200 Sports Complex Rd, Cityville, NY 10002' },
  { id: 'evt-3', date: '2025-08-28T14:00:00', title: 'Sam Lukashok',          location: 'Field B',     address: '200 Sports Complex Rd, Cityville, NY 10002' },
  { id: 'evt-4', date: '2025-08-29T09:00:00', title: 'Sam Lukashok – Round 2',location: 'Fields A–D',  address: '200 Sports Complex Rd, Cityville, NY 10002' },
  { id: 'evt-5', date: '2025-08-29T15:30:00', title: 'Sam Lukashok',          location: 'Main Field',  address: '123 Tournament Way, Cityville, NY 10001' },
  { id: 'evt-6', date: '2025-08-30T11:00:00', title: 'Sam Lukashok',          location: 'Main Field',  address: '123 Tournament Way, Cityville, NY 10001' },
  { id: 'evt-7', date: '2025-08-30T15:00:00', title: 'Sam Lukashok',          location: 'Main Field',  address: '123 Tournament Way, Cityville, NY 10001' },
  { id: 'evt-8', date: '2025-08-30T17:00:00', title: 'Sam Lukashok',          location: 'Main Stage',  address: '500 Celebration Ave, Cityville, NY 10003' },
];

/* ==== BOARD GRID ==== */
const boardPics: Record<string, any> = {
  'Abby Kutin':        pics.abby,
  'Eli Plotkin':       pics.eli,
  'Fisher Angrist':    pics.fisher,
  'Isaac Schiffman':   pics.isaac,
  'Jack Baum':         pics.jack,
  'James Forman':      pics.james,
  'Josh Katz':         pics.josh,
  'Levi Stein':        pics.levi,
  'Lila Ellman':       pics.lila,
  'Matan Silverberg':  pics.matan,
  'Shayna Foreman':    pics.shayna,
  'Viv Schlussel':     pics.viv,
};

type Member = { name: string; line1: string; email: string };

const MEMBERS: Member[] = [
  { name: 'Lila Ellman',      line1: 'Co-Chair',                            email: 'ellmanl@umich.edu'  },
  { name: 'Josh Katz',        line1: 'Co-Chair',                            email: 'joshuaek@umich.edu' },
  { name: 'Levi Stein',       line1: 'Exective Advisor',                    email: 'steinlev@umich.edu' },
  { name: 'Abby Kutin',       line1: 'Website Developer',                   email: 'kutin@umich.edu'    },
  { name: 'Viv Schlussel',    line1: 'Photography',                         email: 'vschluss@umich.edu' },
  { name: 'Shayna Foreman',   line1: 'Events',                              email: 'shaynapf@umich.edu' },
  { name: 'Isaac Schiffman',  line1: 'Recruitment',                         email: 'isaacsch@umich.edu' },
  { name: 'Fisher Angrist',   line1: 'Finance',                             email: 'fangrist@umich.edu' },
  { name: 'Eli Plotkin',      line1: 'Housing',                             email: 'eliplot@umich.edu'  },
  { name: 'James Forman',     line1: 'Gameplay Operations',                 email: 'jameshf@umich.edu'  },
  { name: 'Matan Silverberg', line1: 'Recruitment',                         email: 'matansil@umich.edu' },
  { name: 'Jack Baum',        line1: 'Technology',                          email: 'jackbaum@umich.edu' }
];

/* =========================================
   Memoized Board Card & Grid
========================================= */

const AVATAR = 88;

const BoardCard = React.memo(function BoardCard({
  member,
  onPress,
}: {
  member: Member;
  onPress: (m: Member) => void;
}) {
  const src = boardPics[member.name];
  return (
    <TouchableOpacity
      style={s.boardCard}
      onPress={() => onPress(member)}
      activeOpacity={0.9}
    >
      <View style={s.avatarWrap}>
        <Image source={src} style={s.avatarImg} resizeMode="cover" />
      </View>
      <Text style={s.memberName} numberOfLines={1}>{member.name}</Text>
      <Text style={s.memberSub} numberOfLines={1}>{member.line1}</Text>
    </TouchableOpacity>
  );
}, (prev, next) => (
  prev.member.name === next.member.name &&
  prev.member.line1 === next.member.line1 &&
  prev.onPress === next.onPress
));

const BoardGrid = React.memo(function BoardGrid({
  members,
  onPressMember,
}: {
  members: Member[];
  onPressMember: (m: Member) => void;
}) {
  const renderMember = useCallback(
    ({ item }: { item: Member }) => <BoardCard member={item} onPress={onPressMember} />,
    [onPressMember]
  );

  return (
    <View style={s.boardGridWrap}>
      <Text style={s.boardTitle}>Meet the Board!</Text>
      <FlatList
        data={members}
        keyExtractor={(m) => m.name}
        numColumns={3}
        columnWrapperStyle={s.boardRow}
        contentContainerStyle={s.boardGridPad}
        renderItem={renderMember}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={12}
        windowSize={3}
        getItemLayout={(_, index) => {
          const row = Math.floor(index / 3);
          const ROW_HEIGHT = 18 /* name/sub */ + 8 /* gap */ + AVATAR + 18; // approx; improves perf
          return { length: ROW_HEIGHT, offset: row * ROW_HEIGHT, index };
        }}
      />
      <View style={{ height: 8 }} />
    </View>
  );
});

/* =========================================
   HomeScreen
========================================= */

export default function HomeScreen() {
  const [selectedEvent, setSelectedEvent] = useState<(ScheduleItem & { when: Date }) | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [copied, setCopied] = useState(false);

  const sections = useMemo(() => {
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

    return Array.from(byDay.entries()).map(([key, items]) => {
      const sample = items[0].when;
      const title = sample.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      return { key, title, data: items };
    });
  }, []);

  const open = useCallback(async (url: string) => {
    try { await Linking.openURL(url); } catch {}
  }, []);

  const openInMaps = useCallback((event: ScheduleItem & { when: Date }) => {
    const encoded = encodeURIComponent(event.address || `${event.location} ${event.title}`);
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${encoded}`,
      android: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    });
    if (url) open(url);
  }, [open]);

  const copyEmail = useCallback(async (email: string) => {
    try {
      await Clipboard.setStringAsync(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }, []);

  const renderItem = useCallback(({ item }: { item: ScheduleItem & { when: Date } }) => {
    const time = item.when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return (
      <TouchableOpacity style={s.card} onPress={() => setSelectedEvent(item)} activeOpacity={0.85}>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={2}>{item.title}</Text>
          <Text style={s.meta} numberOfLines={1}>{time} • {item.location}</Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  const renderSectionHeader = useCallback(({ section }: any) => (
    <View style={s.sectionHeader}>
      <Text style={s.sectionHeaderText}>{section.title}</Text>
    </View>
  ), []);

  // Header that scrolls with the list
  const ListHeader = useCallback(() => (
    <View style={s.headerContainer}>
      <Text style={s.header}>Welcome to the official MYFT 2025 App!</Text>
      <Text style={s.sub}>
        Browse teams and players, view schedule of games, set a personalized fantasy football roster, and more!
      </Text>
      <Text style={s.scheduleHeader}>Tournament Schedule</Text>
    </View>
  ), []);

  // Stable press handler passed to BoardGrid (prevents board re-renders)
  const onPressMember = useCallback((m: Member) => {
    setSelectedMember(m);
  }, []);

  return (
    <View style={s.outer}>
      {/* Scrollable content */}
      <SectionList
        sections={sections}
        keyExtractor={(item: any) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled
        ItemSeparatorComponent={() => <View style={s.sep} />}
        SectionSeparatorComponent={() => <View style={s.sectionSep} />}
        contentContainerStyle={[s.listPad, { paddingBottom: 110 }]} // room for fixed footer
        ListHeaderComponent={ListHeader}
        // Pass a memoized component so it doesn't update with unrelated state
        ListFooterComponent={<BoardGrid members={MEMBERS} onPressMember={onPressMember} />}
        showsVerticalScrollIndicator={false}
      />

      {/* Fixed footer (does not scroll) */}
      <View style={s.footerFixed}>
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
        visible={!!selectedEvent}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setSelectedEvent(null)}>
          <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
            {selectedEvent && (
              <>
                <Text style={s.modalTitle}>{selectedEvent.title}</Text>
                <Text style={s.modalMeta}>
                  {selectedEvent.when.toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>

                <View style={s.addrBox}>
                  <Ionicons name="location-outline" size={18} color={YELLOW} />
                  <Text style={s.addrText}>{selectedEvent.address}</Text>
                </View>

                <TouchableOpacity style={s.mapsBtn} onPress={() => openInMaps(selectedEvent)}>
                  <Ionicons name="navigate-outline" size={18} color={NAVY} />
                  <Text style={s.mapsBtnText}>Open in Maps</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.closeBtn} onPress={() => setSelectedEvent(null)}>
                  <Text style={s.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Board image enlarge modal + copy email */}
      <Modal
        visible={!!selectedMember}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMember(null)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setSelectedMember(null)}>
          <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
            {selectedMember && (
              <>
                <View style={s.modalAvatarWrap}>
                  <Image
                    source={boardPics[selectedMember.name]}
                    style={s.modalAvatarImg}
                    resizeMode="cover"
                  />
                </View>

                <Text style={s.modalName}>{selectedMember.name}</Text>
                <Text style={s.modalSub}>{selectedMember.line1}</Text>

                <View style={s.contactRow}>
                  <Text style={s.contactLabel}>Contact:</Text>

                  <TouchableOpacity
                    style={s.emailBtn}
                    onPress={() => copyEmail(selectedMember.email)}
                    activeOpacity={0.85}
                  >
                    <Text style={s.emailText} numberOfLines={1}>
                      {selectedMember.email}
                    </Text>
                    <Ionicons name="copy-outline" size={18} color={YELLOW} />
                  </TouchableOpacity>
                </View>

                {copied ? <Text style={s.copiedHint}>Copied!</Text> : null}

                <TouchableOpacity style={s.closeBtn} onPress={() => setSelectedMember(null)}>
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

  headerContainer: { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 8 },
  header: { color: YELLOW, fontSize: 24, fontWeight: '900', textAlign: 'center', fontFamily: FONT_FAMILIES.archivoBlack},
  sub: { color: TEXT, opacity: 0.9, fontSize: 14, textAlign: 'center', marginTop: 6, fontFamily: FONT_FAMILIES.archivoNarrow },
  scheduleHeader: { color: YELLOW, fontSize: 25, fontWeight: '900', textAlign: 'center', marginTop: 16, marginBottom: 10, fontFamily: FONT_FAMILIES.archivoBlack },

  listPad: { paddingHorizontal: 16 },

  sectionHeader: { backgroundColor: NAVY, paddingVertical: 8, paddingHorizontal: 6 },
  sectionHeaderText: { color: YELLOW, fontWeight: '900', fontSize: 16, fontFamily: FONT_FAMILIES.archivoBlack},

  sectionSep: { height: 4 },
  sep: { height: 10 },

  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: LINE,
  },
  title: { color: TEXT, fontSize: 16, fontWeight: '800', fontFamily: FONT_FAMILIES.archivoBlack},
  meta: { color: TEXT, fontSize: 12, marginTop: 4, fontFamily: FONT_FAMILIES.archivoNarrow },

  /* Board grid (in list footer) */
  boardGridWrap: { paddingHorizontal: 0, paddingBottom: 10, marginTop: 20 },
  boardTitle: { color: YELLOW, fontSize: 18, fontWeight: '900', marginBottom: 10, textAlign: 'center', fontFamily: FONT_FAMILIES.archivoBlack},
  boardGridPad: { paddingHorizontal: 4, paddingBottom: 8 },
  boardRow: { justifyContent: 'space-between', marginBottom: 18 },
  boardCard: { width: '31.5%', alignItems: 'center' },

  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    backgroundColor: NAVY,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.35)',
    marginBottom: 8,
  },
  avatarImg: { width: '100%', height: '100%' },
  memberName: { color: YELLOW, fontWeight: '900', fontSize: 12, textAlign: 'center', fontFamily: FONT_FAMILIES.archivoBlack },
  memberSub: { color: TEXT, fontSize: 11, textAlign: 'center', fontFamily: FONT_FAMILIES.archivoNarrow},

  // Fixed footer buttons (not scrolling)
  footerFixed: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: LINE,
    backgroundColor: NAVY,
  },
  iconCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.18)',
    marginHorizontal: 8,
  },
  iconLabel: { color: TEXT, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FONT_FAMILIES.archivoNarrow},

  // Modal shared styles
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
  modalTitle: { color: YELLOW, fontSize: 18, fontWeight: '900', textAlign: 'center', fontFamily: FONT_FAMILIES.archivoBlack },
  modalMeta: { color: TEXT, fontSize: 13, marginTop: 6, marginBottom: 10, fontFamily: FONT_FAMILIES.archivoNarrow},
  addrBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  addrText: { color: TEXT, fontSize: 13, textAlign: 'center', fontFamily: FONT_FAMILIES.archivoNarrow },
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
  mapsBtnText: { color: NAVY, fontWeight: '900', fontFamily: FONT_FAMILIES.archivoBlack},
  closeBtn: { paddingVertical: 8, paddingHorizontal: 10 },
  closeBtnText: { color: TEXT, fontWeight: '700', fontFamily: FONT_FAMILIES.archivoBlack},

  // Image modal + contact
  modalAvatarWrap: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    backgroundColor: NAVY,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.35)',
    marginBottom: 12,
  },
  modalAvatarImg: { width: '100%', height: '100%' },
  modalName: { color: YELLOW, fontWeight: '900', fontSize: 20, textAlign: 'center', marginBottom: 4, fontFamily: FONT_FAMILIES.archivoBlack},
  modalSub: { color: TEXT, fontSize: 13, textAlign: 'center', fontFamily: FONT_FAMILIES.archivoNarrow },

  contactRow: {
    width: '100%',
    marginTop: 10,
    alignItems: 'center',
    gap: 6,
  },
  contactLabel: {
    color: TEXT,
    fontSize: 12,
    opacity: 0.9,
    marginBottom: 2,
    fontFamily: FONT_FAMILIES.archivoBlack
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CARD,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
    maxWidth: '100%',
  },
  emailText: {
    color: YELLOW,
    fontWeight: '800',
    fontFamily: FONT_FAMILIES.archivoBlack
  },
  copiedHint: {
    color: YELLOW,
    fontWeight: '800',
    marginTop: 6,
    fontFamily: FONT_FAMILIES.archivoNarrow
  },
});
