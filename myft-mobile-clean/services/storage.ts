// services/storage.ts
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebaseConfig'; // make sure firebaseConfig exports app

const storage = getStorage(app);

export async function uploadUserAvatar(uid: string, localUri: string): Promise<string> {
  // turn local file into a Blob
  const res = await fetch(localUri);
  const blob = await res.blob();

  // naive content type guess
  const isPng = localUri.toLowerCase().endsWith('.png');
  const contentType = isPng ? 'image/png' : 'image/jpeg';
  const path = `users/${uid}/avatar.${isPng ? 'png' : 'jpg'}`;

  const r = ref(storage, path);
  await uploadBytes(r, blob, { contentType });
  return await getDownloadURL(r);
}
