// services/users.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebaseConfig';

export type UserProfile = {
  uid: string;
  displayName: string;
  username: string;
  photoUrl?: string;
  boys_roster: string[];
  girls_roster: string[];
  hasOnboarded: boolean,
};

export async function userExists(uid: string): Promise<boolean> {
  const d = await getDoc(doc(db, 'users', uid));
  return d.exists();
}

/**
 * Upload a local image URI to Firebase Storage and return its download URL.
 * Accepts file://, content:// (Android), or http(s):// (passes through).
 */
async function uploadAvatarForUid(uid: string, localUri: string): Promise<string> {
  // If already a remote URL, just return it
  if (/^https?:\/\//i.test(localUri)) return localUri;

  // Fetch the local file as a Blob for uploadBytes()
  const resp = await fetch(localUri);
  const blob = await resp.blob();

  // Guess a mime (Blob.type is usually set correctly by fetch)
  const contentType = blob.type || 'image/jpeg';

  // Timestamped filename to avoid CDN caching old avatars
  const ts = Date.now();
  const objectRef = ref(storage, `users/${uid}/avatar_${ts}.jpg`);

  await uploadBytes(objectRef, blob, { contentType });
  return await getDownloadURL(objectRef);
}

/** Create a user doc (merging if exists). Uploads photo if a local URI is provided. */
export async function createUserProfile(input: {
  uid: string;
  displayName: string;
  username: string;
  photoUrl?: string; // local uri or remote URL; optional
}): Promise<void> {
  const { uid, displayName, username, photoUrl } = input;

  let finalPhotoUrl: string | undefined;
  try {
    if (photoUrl) {
      // Upload if local; passthrough if already remote
      finalPhotoUrl = await uploadAvatarForUid(uid, photoUrl);
    }
  } catch (e) {
    console.warn('[createUserProfile] avatar upload failed, continuing without photo:', e);
  }

  const docRef = doc(db, 'users', uid);
  const profile: Partial<UserProfile> = {
    uid,
    displayName,
    username,
    boys_roster: [],
    girls_roster: [],
    ...(finalPhotoUrl ? { photoUrl: finalPhotoUrl } : {}),
  };

  await setDoc(docRef, profile, { merge: true });
}

/** Get a single user profile */
export async function getUser(uid: string): Promise<UserProfile | null> {
  const d = await getDoc(doc(db, 'users', uid));
  return d.exists() ? (d.data() as UserProfile) : null;
}

/** Update parts of a user profile. If photoUrl is a local URI, it will be uploaded first. */
export async function updateUserProfile(
  uid: string,
  partial: Partial<UserProfile>
): Promise<void> {
  const docRef = doc(db, 'users', uid);

  const payload: Partial<UserProfile> = { ...partial };

  // If a new photoUrl is provided and appears local, upload first
  try {
    if (typeof partial.photoUrl === 'string') {
      const isRemote = /^https?:\/\//i.test(partial.photoUrl);
      const looksLocal = partial.photoUrl.startsWith('file:') || partial.photoUrl.startsWith('content:') || !isRemote;
      if (looksLocal) {
        payload.photoUrl = await uploadAvatarForUid(uid, partial.photoUrl);
      }
    }
  } catch (e) {
    console.warn('[updateUserProfile] avatar upload failed, skipping photoUrl update:', e);
    // ensure we don’t send a broken photoUrl to Firestore
    delete (payload as any).photoUrl;
  }

  await updateDoc(docRef, payload as any);
}

/** List ALL users (for leaderboard) */
export async function listUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => d.data() as UserProfile);
}
