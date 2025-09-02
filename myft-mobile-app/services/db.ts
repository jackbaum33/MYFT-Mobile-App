// services/db.ts
import {
    collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, where,
    updateDoc, setDoc, serverTimestamp, Timestamp, limit, DocumentData
  } from 'firebase/firestore';
  import { db } from './firebase';
  
  /* ===========================
     Types
  =========================== */
  
  export type Division = 'boys' | 'girls';
  
  export type ScheduleDoc = {
    title: string;
    location: string;
    address: string;
    startAt: Timestamp;
  };
  export type ScheduleItem = {
    id: string;
    title: string;
    location: string;
    address: string;
    when: Date;
  };
  
  export type TeamDoc = {
    name: string;
    division: Division;
    captain: string;
    logoURL?: string;
    wins: number;
    losses: number;
    playerIDs: string[];
  };
  
  export type PlayerTotals = {
    touchdowns: number;
    passingTDs: number;
    shortReceptions: number;
    mediumReceptions: number;
    longReceptions: number;
    catches: number;
    flagsPulled: number;
    sacks: number;
    interceptions: number;
    passingInterceptions: number;
  };
  export type PlayerDoc = {
    name: string;
    division: Division;
    teamID: string;
    photoURL?: string;
    // You currently store this as an array in Firestore; we coerce below.
    seasonTotals: PlayerTotals | number[];
  };
  
  export type GameStatus = 'Scheduled' | 'Live' | 'Final';
  export type Gender = 'men' | 'women';
  export type GameDoc = {
    gender: Gender;
    status: GameStatus;
    teamID1: string;
    teamID2: string;
    time: Timestamp;
    field?: string;
  };
  
  export type UserDoc = {
    displayName: string;
    username: string;
    photoURL?: string;
    boys_roster: string[];
    girls_roster: string[];
    updatedAt?: Timestamp;
  };
  
  /* ===========================
     Small utilities
  =========================== */
  
  export const tsToDate = (ts?: Timestamp | null) => (ts ? ts.toDate() : new Date());
  
  export const coerceTotals = (v?: DocumentData): PlayerTotals => {
    if (!v) {
      return {
        touchdowns: 0, passingTDs: 0, shortReceptions: 0, mediumReceptions: 0, longReceptions: 0,
        catches: 0, flagsPulled: 0, sacks: 0, interceptions: 0, passingInterceptions: 0,
      };
    }
    if (Array.isArray(v)) {
      const [touchdowns=0, passingTDs=0, shortReceptions=0, mediumReceptions=0, longReceptions=0,
        catches=0, flagsPulled=0, sacks=0, interceptions=0, passingInterceptions=0] = v as number[];
      return { touchdowns, passingTDs, shortReceptions, mediumReceptions, longReceptions,
               catches, flagsPulled, sacks, interceptions, passingInterceptions };
    }
    const d = v as Partial<PlayerTotals>;
    return {
      touchdowns: d.touchdowns ?? 0,
      passingTDs: d.passingTDs ?? 0,
      shortReceptions: d.shortReceptions ?? 0,
      mediumReceptions: d.mediumReceptions ?? 0,
      longReceptions: d.longReceptions ?? 0,
      catches: d.catches ?? 0,
      flagsPulled: d.flagsPulled ?? 0,
      sacks: d.sacks ?? 0,
      interceptions: d.interceptions ?? 0,
      passingInterceptions: d.passingInterceptions ?? 0,
    };
  };
  
  /* ===========================
     SCHEDULE (read-only)
  =========================== */
  
  export async function fetchSchedule(): Promise<ScheduleItem[]> {
    const q = query(collection(db, 'schedule'), orderBy('startAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as ScheduleDoc;
      return {
        id: d.id,
        title: data.title,
        location: data.location,
        address: data.address,
        when: tsToDate(data.startAt),
      };
    });
  }
  
  export function listenSchedule(
    onData: (items: ScheduleItem[]) => void,
    onError?: (e: unknown) => void
  ) {
    const q = query(collection(db, 'schedule'), orderBy('startAt', 'asc'));
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => {
        const data = d.data() as ScheduleDoc;
        return {
          id: d.id,
          title: data.title,
          location: data.location,
          address: data.address,
          when: tsToDate(data.startAt),
        };
      });
      onData(items);
    }, onError);
  }
  
  /* ===========================
     TEAMS (read-only)
  =========================== */
  
  export async function fetchTeams(): Promise<(TeamDoc & { id: string })[]> {
    const q = query(collection(db, 'teams'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as TeamDoc) }));
  }
  
  export async function fetchTeam(teamID: string) {
    const s = await getDoc(doc(db, 'teams', teamID));
    return s.exists() ? ({ id: s.id, ...(s.data() as TeamDoc) }) : null;
  }
  
  /* ===========================
     PLAYERS (read-only)
  =========================== */
  
  export async function fetchPlayersByTeam(teamID: string) {
    const q = query(collection(db, 'players'), where('teamID', '==', teamID));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as PlayerDoc;
      return { id: d.id, ...data, seasonTotals: coerceTotals(data.seasonTotals) };
    });
  }
  
  export async function fetchPlayer(playerID: string) {
    const s = await getDoc(doc(db, 'players', playerID));
    if (!s.exists()) return null;
    const data = s.data() as PlayerDoc;
    return { id: s.id, ...data, seasonTotals: coerceTotals(data.seasonTotals) };
  }
  
  /* ===========================
     GAMES (read-only)
  =========================== */
  
  export async function fetchUpcomingGames(limitCount = 20) {
    const now = Timestamp.fromDate(new Date());
    const qy = query(
      collection(db, 'games'),
      where('time', '>=', now),
      orderBy('time', 'asc'),
      limit(limitCount)
    );
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as GameDoc) }));
  }
  
  export async function fetchGame(gameID: string) {
    const s = await getDoc(doc(db, 'games', gameID));
    return s.exists() ? ({ id: s.id, ...(s.data() as GameDoc) }) : null;
  }
  
  /* ===========================
     USERS (only writes allowed)
  =========================== */
  
  // Create or merge a user profile after login
  export async function upsertUser(uid: string, patch: Partial<UserDoc>) {
    const ref = doc(db, 'users', uid);
    await setDoc(
      ref,
      {
        displayName: '',
        username: '',
        boys_roster: [],
        girls_roster: [],
        updatedAt: serverTimestamp(),
        ...patch,
      },
      { merge: true }
    );
  }
  
  // Read a user profile
  export async function getUser(uid: string) {
    const s = await getDoc(doc(db, 'users', uid));
    return s.exists() ? ({ id: s.id, ...(s.data() as UserDoc) }) : null;
  }
  
  // Replace a roster (client passes full array)
  export async function setRoster(uid: string, division: Division, playerIDs: string[]) {
    const field = division === 'boys' ? 'boys_roster' : 'girls_roster';
    await updateDoc(doc(db, 'users', uid), {
      [field]: playerIDs.slice(0, 8), // hard cap on client side too
      updatedAt: serverTimestamp(),
    });
  }
  