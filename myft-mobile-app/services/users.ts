// services/users.ts
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, storage } from './firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

export type UserDoc = {
  uid: string;
  displayName: string;
  username: string;
  photoUrl: string | null;
  boys_roster: string[];
  girls_roster: string[];
  createdAt: any;
};

export async function userExists(uid: string) {
  const d = await getDoc(doc(db, 'users', uid));
  return d.exists();
}

export async function getUser(uid: string) {
  const d = await getDoc(doc(db, 'users', uid));
  return d.exists() ? (d.data() as UserDoc) : null;
}

/** Upload avatar to `users/{uid}/avatar.jpg` and return a download URL */
export async function uploadAvatar(uid: string, localUri: string): Promise<string> {
  // localUri => blob
  const res = await fetch(localUri);
  const blob = await res.blob();

  const path = `users/${uid}/avatar.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return await getDownloadURL(storageRef);
}

/** Create user profile (idempotent) */
export async function createUserProfile(params: {
  uid: string;
  displayName: string;
  username: string;
  photoUri?: string | null;
}) {
  const { uid, displayName, username, photoUri } = params;

  let photoUrl: string | null = null;
  if (photoUri) {
    try {
      photoUrl = await uploadAvatar(uid, photoUri);
    } catch (e) {
      console.warn('[users] avatar upload failed, continuing without photo:', e);
    }
  }

  const payload: UserDoc = {
    uid,
    displayName,
    username: username.toLowerCase(), // normalize
    photoUrl,
    boys_roster: [],
    girls_roster: [],
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', uid), payload, { merge: true });
  return payload;
}
