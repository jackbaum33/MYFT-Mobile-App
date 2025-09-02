// services/users.ts
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebaseConfig';

export type UserProfile = {
  uid: string;
  displayName: string;
  username: string;
  photoUrl?: string;
  boys_roster: string[];
  girls_roster: string[];
};

export async function userExists(uid: string): Promise<boolean> {
  const d = await getDoc(doc(db, 'users', uid));
  return d.exists();
}

/** Upload a local file:// image to Storage and return a https download URL. */
async function uploadAvatarForUid(uid: string, localUri: string): Promise<string> {
  try {
    console.log('Starting image upload for uid:', uid, 'URI:', localUri);
    
    // Turn local file into a Blob that Firebase can upload
    const resp = await fetch(localUri);
    const blob = await resp.blob();

    console.log('Blob created, size:', blob.size, 'type:', blob.type);

    const objectRef = ref(storage, `users/${uid}/avatar.jpg`);
    await uploadBytes(objectRef, blob);
    
    const downloadURL = await getDownloadURL(objectRef);
    console.log('Image uploaded successfully, URL:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('Error in uploadAvatarForUid:', error);
    throw error;
  }
}

export async function createUserProfile(input: {
  uid: string;
  displayName: string;
  username: string;
  photoUrl?: string; // may be a local file:// uri, or undefined
}): Promise<void> {
  const { uid, displayName, username } = input;
  let finalPhotoUrl: string | undefined = undefined;

  console.log('Creating user profile with input:', input);

  try {
    if (input.photoUrl) {
      if (input.photoUrl.startsWith('file:')) {
        console.log('Detected local file URI, uploading to Firebase Storage...');
        finalPhotoUrl = await uploadAvatarForUid(uid, input.photoUrl);
      } else if (/^https?:\/\//.test(input.photoUrl)) {
        console.log('Using existing remote URL');
        finalPhotoUrl = input.photoUrl; // already a remote URL
      } else {
        // Handle content:// URIs (Android) or other local URIs
        console.log('Detected local URI (non-file), attempting upload...');
        finalPhotoUrl = await uploadAvatarForUid(uid, input.photoUrl);
      }
    }
  } catch (e: any) {
    console.warn('[createUserProfile] photo upload failed:', e?.code, e?.message);
    console.warn('Full error:', e);
    // Continue without a photo
  }

  const docRef = doc(db, 'users', uid);
  const profileData: any = {
    uid,
    displayName,
    username,
    boys_roster: [],
    girls_roster: [],
  };

  // Only add photoUrl if it exists (Firestore doesn't accept undefined)
  if (finalPhotoUrl) {
    profileData.photoUrl = finalPhotoUrl;
  }

  console.log('Saving profile data to Firestore:', profileData);

  await setDoc(docRef, profileData, { merge: true });
  console.log('Profile saved successfully');
}

export async function getUser(uid: string): Promise<UserProfile | null> {
  const d = await getDoc(doc(db, 'users', uid));
  return d.exists() ? (d.data() as UserProfile) : null;
}

export async function updateUserProfile(uid: string, partial: Partial<UserProfile>): Promise<void> {
  const docRef = doc(db, 'users', uid);

  // If caller passed a local file path for photoUrl, upload first
  let payload = { ...partial } as any;
  try {
    if (typeof partial.photoUrl === 'string') {
      if (partial.photoUrl.startsWith('file:') || 
          partial.photoUrl.startsWith('content:') || 
          !partial.photoUrl.startsWith('http')) {
        const url = await uploadAvatarForUid(uid, partial.photoUrl);
        payload.photoUrl = url;
      }
    }
  } catch (e: any) {
    console.warn('[updateUserProfile] photo upload failed:', e?.code, e?.message);
    // fallback: remove photoUrl from payload if upload failed
    delete payload.photoUrl;
  }

  await updateDoc(docRef, payload);
}