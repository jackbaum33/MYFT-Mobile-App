// services/leagues.ts - Fantasy Leagues (draft-based)
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  arrayUnion,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { Division } from '../context/TournamentContext';

export type DraftStyle = 'snake' | 'linear';
export type LeagueStatus = 'pending' | 'drafting' | 'complete';

export type League = {
  name: string;
  ownerUid: string;
  memberUids: string[];
  boysPerTeam: number;
  girlsPerTeam: number;
  draftStyle: DraftStyle;
  scheduledStart: Timestamp;
  status: LeagueStatus;
  draftOrder?: string[];
  currentPickNumber?: number;
  totalPicks?: number;
  draftedPlayerIds?: string[];
  createdAt: Timestamp;
};

export type LeagueWithId = League & { id: string };

export type LeagueRoster = { uid: string; boys: string[]; girls: string[] };

// Named DraftPick (not Pick) to avoid colliding with the built-in Pick<T,K> utility type.
export type DraftPick = {
  pickNumber: number;
  round: number;
  uid: string;
  playerId: string;
  division: Division;
  timestamp: Timestamp;
};

export type DraftPickWithId = DraftPick & { id: string };

/**
 * Standard snake-fantasy-draft turn order: pick n's turn is n % numMembers,
 * reversed on odd rounds when draftStyle is 'snake'. Mirrors
 * functions/src/leagues.ts's pickerForNumber (no shared package between
 * app/ and functions/).
 */
export function pickerForNumber(
  league: Pick<League, 'draftOrder' | 'draftStyle'>,
  pickNumber: number
): string | undefined {
  const order = league.draftOrder;
  if (!order || order.length === 0) return undefined;
  const n = order.length;
  const round = Math.floor(pickNumber / n);
  const idx = pickNumber % n;
  const reversed = league.draftStyle === 'snake' && round % 2 === 1;
  return reversed ? order[n - 1 - idx] : order[idx];
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function listMyLeagues(uid: string): Promise<LeagueWithId[]> {
  const q = query(collection(db, 'leagues'), where('memberUids', 'array-contains', uid));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as League) }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

export async function createLeague(input: {
  name: string;
  ownerUid: string;
  memberUids: string[]; // must include owner
  boysPerTeam: number;
  girlsPerTeam: number;
  draftStyle: DraftStyle;
  scheduledStart: Date;
}): Promise<string> {
  const ref = doc(collection(db, 'leagues'));
  const league: Omit<League, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    name: input.name,
    ownerUid: input.ownerUid,
    memberUids: input.memberUids,
    boysPerTeam: input.boysPerTeam,
    girlsPerTeam: input.girlsPerTeam,
    draftStyle: input.draftStyle,
    scheduledStart: Timestamp.fromDate(input.scheduledStart),
    status: 'pending',
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, league);
  return ref.id;
}

/** Owner-only by app convention (no Firestore rules enforce it yet). */
export async function startDraft(leagueId: string, league: League): Promise<void> {
  const draftOrder = shuffle(league.memberUids);
  const rounds = league.boysPerTeam + league.girlsPerTeam;
  const totalPicks = rounds * league.memberUids.length;

  const batch = writeBatch(db);
  batch.update(doc(db, 'leagues', leagueId), {
    status: 'drafting',
    draftOrder,
    currentPickNumber: 0,
    totalPicks,
    draftedPlayerIds: [],
  });
  for (const uid of league.memberUids) {
    batch.set(doc(db, 'leagues', leagueId, 'rosters', uid), { uid, boys: [], girls: [] });
  }
  await batch.commit();
}

/**
 * Atomically claims the current pick for `uid`, guarding against
 * out-of-turn picks, already-drafted players, and full roster slots.
 * Throws with a user-facing message on any rejection.
 */
export async function submitPick(
  leagueId: string,
  uid: string,
  playerId: string,
  division: Division
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const leagueRef = doc(db, 'leagues', leagueId);
    const leagueSnap = await tx.get(leagueRef);
    if (!leagueSnap.exists()) throw new Error('League not found');
    const league = leagueSnap.data() as League;

    if (league.status !== 'drafting') throw new Error('The draft is not active');

    const pickNumber = league.currentPickNumber ?? 0;
    const onTheClock = pickerForNumber(league, pickNumber);
    if (onTheClock !== uid) throw new Error("It's not your turn");
    if ((league.draftedPlayerIds ?? []).includes(playerId)) throw new Error('That player was just drafted');

    const rosterRef = doc(db, 'leagues', leagueId, 'rosters', uid);
    const rosterSnap = await tx.get(rosterRef);
    const roster = (rosterSnap.exists() ? (rosterSnap.data() as LeagueRoster) : { uid, boys: [], girls: [] });
    const cap = division === 'boys' ? league.boysPerTeam : league.girlsPerTeam;
    if ((roster[division] ?? []).length >= cap) {
      throw new Error(`Your ${division} roster is already full`);
    }

    const numMembers = league.memberUids.length;
    const round = Math.floor(pickNumber / numMembers);
    const pickRef = doc(collection(db, 'leagues', leagueId, 'picks'));
    tx.set(pickRef, {
      pickNumber,
      round,
      uid,
      playerId,
      division,
      timestamp: serverTimestamp(),
    });

    tx.set(rosterRef, { ...roster, [division]: arrayUnion(playerId) }, { merge: true });

    const newPickNumber = pickNumber + 1;
    const totalPicks = league.totalPicks ?? 0;
    tx.update(leagueRef, {
      draftedPlayerIds: arrayUnion(playerId),
      currentPickNumber: newPickNumber,
      status: newPickNumber >= totalPicks ? 'complete' : 'drafting',
    });
  });
}

export function subscribeToLeague(leagueId: string, cb: (league: LeagueWithId | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'leagues', leagueId), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...(snap.data() as League) } : null);
  });
}

export function subscribeToPicks(leagueId: string, cb: (picks: DraftPickWithId[]) => void): Unsubscribe {
  const q = query(collection(db, 'leagues', leagueId, 'picks'), orderBy('pickNumber'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as DraftPick) })));
  });
}

export function subscribeToRosters(leagueId: string, cb: (rosters: LeagueRoster[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'leagues', leagueId, 'rosters'), (snap) => {
    cb(snap.docs.map((d) => d.data() as LeagueRoster));
  });
}

export async function getRoster(leagueId: string, uid: string): Promise<LeagueRoster | null> {
  const snap = await getDoc(doc(db, 'leagues', leagueId, 'rosters', uid));
  return snap.exists() ? (snap.data() as LeagueRoster) : null;
}

/** Owner-only by app convention (enforced in Firestore rules). Also clears out rosters/picks subcollections. */
export async function deleteLeague(leagueId: string): Promise<void> {
  const [rostersSnap, picksSnap] = await Promise.all([
    getDocs(collection(db, 'leagues', leagueId, 'rosters')),
    getDocs(collection(db, 'leagues', leagueId, 'picks')),
  ]);
  const batch = writeBatch(db);
  rostersSnap.forEach((d) => batch.delete(d.ref));
  picksSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'leagues', leagueId));
  await batch.commit();
}
