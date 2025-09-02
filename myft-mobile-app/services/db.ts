// services/db.ts
import {
    collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc,
    Timestamp, FirestoreError
  } from 'firebase/firestore';
  import { db } from './firebase';
  
  /* =========================
     Shared types
  ========================= */
  
  export type Gender = 'men' | 'women';
  export type Division = 'boys' | 'girls';
  
  export type UserDoc = {
    displayName?: string;
    username?: string;
    photoURL?: string;
    boys_roster?: string[];   // player IDs
    girls_roster?: string[];  // player IDs
    createdAt?: Timestamp;
  };
  
  export type TeamDoc = {
    name: string;
    division: Division;       // 'boys' | 'girls'
    captain: string;
    logoURL?: string;
    wins: number;
    losses: number;
    playerIDs: string[];      // players on team
  };
  
  export type PlayerDoc = {
    name: string;
    teamID: string;
    division: Division;       // 'boys' | 'girls'
    photoURL?: string;
    // Fantasy season totals (optional)
    seasonTotals?: {
      touchdowns?: number;
      passingTDs?: number;
      shortReceptions?: number;
      mediumReceptions?: number;
      longReceptions?: number;
      catches?: number;
      flagsPulled?: number;
      sacks?: number;
      interceptions?: number;
      passingInterceptions?: number;
    };
  };
  
  export type GameStatus = 'Scheduled' | 'Live' | 'Final';
  
  export type GameDoc = {
    gender: Gender;
    status: GameStatus;
    time: Timestamp;
    teamID1: string;
    teamID2: string;
    field?: string;
    // (You can add liveStats/finalBoxScore subcollections later)
  };
  
  export type ScheduleDoc = {
    title: string;
    location: string;
    address: string;
    startAt: Timestamp;
  };
  
  /* =========================
     READ helpers (no auth needed)
  ========================= */
  
  // Schedule (ordered by startAt)
  export async function fetchSchedule(): Promise<Array<{ id: string } & ScheduleDoc>> {
    const q = query(collection(db, 'schedule'), orderBy('startAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as ScheduleDoc) }));
  }
  
  // Optional real-time subscription to schedule
  export function subscribeSchedule(
    onNext: (events: Array<{ id: string } & ScheduleDoc>) => void,
    onError?: (e: FirestoreError) => void
  ) {
    const q = query(collection(db, 'schedule'), orderBy('startAt', 'asc'));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as ScheduleDoc) }));
        onNext(items);
      },
      onError
    );
  }
  
  // Teams
  export async function fetchTeams(): Promise<Array<{ id: string } & TeamDoc>> {
    const snap = await getDocs(collection(db, 'teams'));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as TeamDoc) }));
  }
  
  // Players
  export async function fetchPlayers(): Promise<Array<{ id: string } & PlayerDoc>> {
    const snap = await getDocs(collection(db, 'players'));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as PlayerDoc) }));
  }
  
  // Games
  export async function fetchGames(): Promise<Array<{ id: string } & GameDoc>> {
    const snap = await getDocs(collection(db, 'games'));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as GameDoc) }));
  }
  
  // Single user (read)
  export async function getUser(uid: string): Promise<(UserDoc & { id: string }) | null> {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...(snap.data() as UserDoc) }) : null;
  }
  
  /* =========================
     WRITE helpers (allowed by rules)
  ========================= */
  
  // Create/merge a user profile (first login or subsequent edits)
  export async function createOrMergeUserProfile(
    uid: string,
    data: Partial<UserDoc>
  ): Promise<void> {
    const ref = doc(db, 'users', uid);
    // Set createdAt on first write only
    const current = await getDoc(ref);
    const payload: UserDoc = current.exists()
      ? (data as UserDoc)
      : { ...data, createdAt: Timestamp.now() } as UserDoc;
    await setDoc(ref, payload, { merge: true });
  }
  
  // Update only the fantasy roster for a user
  export async function updateUserRoster(
    uid: string,
    opts: { boys?: string[]; girls?: string[] }
  ): Promise<void> {
    const ref = doc(db, 'users', uid);
    const patch: Partial<UserDoc> = {};
    if (opts.boys)  patch.boys_roster  = opts.boys;
    if (opts.girls) patch.girls_roster = opts.girls;
    await updateDoc(ref, patch as any);
  }
  