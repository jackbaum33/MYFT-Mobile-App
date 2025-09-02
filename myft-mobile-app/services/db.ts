// services/db.ts
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    getDocs,
    query,
    orderBy,
    where,
  } from 'firebase/firestore';
  import { db } from './firebaseConfig';

  export type ScheduleDoc = {
    title: string;
    location: string;
    address: string;
    startAt: any; // Firestore Timestamp (or string if you store as string)
  };
  
  /* ========================
     USERS
  ======================== */
  
  export async function getUser(uid: string) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
  
  export async function createOrUpdateUser(uid: string, data: any) {
    const ref = doc(db, 'users', uid);
    await setDoc(ref, data, { merge: true });
  }
  
  export async function updateUserRoster(uid: string, roster: { boys?: string[]; girls?: string[] }) {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, roster);
  }
  
  /* ========================
     TEAMS
  ======================== */
  
  export async function getTeams() {
    const snap = await getDocs(collection(db, 'teams'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  
  export async function getTeamById(teamId: string) {
    const ref = doc(db, 'teams', teamId);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
  
  /* ========================
     PLAYERS
  ======================== */
  
  export async function getPlayers() {
    const snap = await getDocs(collection(db, 'players'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  
  export async function getPlayerById(playerId: string) {
    const ref = doc(db, 'players', playerId);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
  
  /* ========================
     GAMES
  ======================== */
  
  export async function getGames() {
    const snap = await getDocs(collection(db, 'games'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  
  export async function getGameById(gameId: string) {
    const ref = doc(db, 'games', gameId);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
  
  /* ========================
     SCHEDULE
  ======================== */
  
  export async function getSchedule(): Promise<Array<{ id: string } & ScheduleDoc>> {
    const q = query(collection(db, 'schedule'), orderBy('startAt', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as ScheduleDoc),
    }));
  }
  