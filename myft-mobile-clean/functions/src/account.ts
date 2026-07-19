import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const db = () => admin.firestore();

/**
 * Deletes the caller's account: removes them from any leagues they belong
 * to, deletes their user doc and Storage files, then deletes the Auth user
 * itself. Runs with Admin SDK privileges so it isn't subject to Firestore
 * security rules (needed to edit other members' league docs) or the client
 * SDK's requires-recent-login check on deleteUser.
 */
export const deleteAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to delete your account.');
  }

  const leaguesSnap = await db().collection('leagues').where('memberUids', 'array-contains', uid).get();

  const batch = db().batch();
  for (const leagueDoc of leaguesSnap.docs) {
    batch.update(leagueDoc.ref, {
      memberUids: admin.firestore.FieldValue.arrayRemove(uid),
    });
    batch.delete(leagueDoc.ref.collection('rosters').doc(uid));
  }
  batch.delete(db().doc(`users/${uid}`));
  await batch.commit();

  try {
    await admin.storage().bucket().deleteFiles({ prefix: `users/${uid}/` });
  } catch (e) {
    console.warn(`[deleteAccount] failed to delete Storage files for ${uid}:`, e);
  }

  await admin.auth().deleteUser(uid);

  return { success: true };
});
