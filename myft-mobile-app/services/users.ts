// services/users.ts (shape reference)
import { db } from '@/services/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { AppUser } from '@/context/AuthContext';

export async function getUser(uid: string): Promise<AppUser | null> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as AppUser) : null;
}

export async function userExists(uid: string): Promise<boolean> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists();
}

export async function createUserProfile(input: {
  uid: string;
  displayName: string;
  username: string;
  photoUrl?: string;      // URL after upload (Login can pass undefined initially)
}) {
  const ref = doc(db, 'users', input.uid);
  const payload: AppUser = {
    uid: input.uid,
    displayName: input.displayName,
    username: input.username,
    photoUrl: input.photoUrl,
    boys_roster: [],
    girls_roster: [],
  };
  await setDoc(ref, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return payload;
}

export async function updateUserProfile(uid: string, partial: Partial<AppUser>) {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { ...partial, updatedAt: serverTimestamp() });
}
