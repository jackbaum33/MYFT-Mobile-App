#!/usr/bin/env node
/**
 * One-time full reset for myft-2025: deletes every user account (Firestore
 * users/{uid} + their Storage files + their Firebase Auth account) and every
 * league (leagues/{id} + rosters/picks subcollections).
 *
 * Run this YOURSELF — it needs your own gcloud/firebase admin credentials,
 * not something an agent should run on your behalf.
 *
 * Usage:
 *   cd functions
 *   node scripts/resetAllUsers.js
 *
 * Requires one of:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing at a myft-2025 service
 *     account key (Firebase Console -> Project Settings -> Service Accounts
 *     -> Generate new private key), or
 *   - `gcloud auth application-default login --project myft-2025` already run
 */
const admin = require('firebase-admin');
const readline = require('readline');

admin.initializeApp({ projectId: 'myft-2025' });

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket();

function confirm(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function deleteAllAuthUsers() {
  let deleted = 0;
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    if (result.users.length > 0) {
      const uids = result.users.map((u) => u.uid);
      const res = await auth.deleteUsers(uids);
      deleted += res.successCount;
      if (res.failureCount > 0) {
        console.warn(`  ⚠️ ${res.failureCount} auth user(s) failed to delete:`, res.errors);
      }
    }
    pageToken = result.pageToken;
  } while (pageToken);
  return deleted;
}

async function main() {
  const usersSnap = await db.collection('users').get();
  const leaguesSnap = await db.collection('leagues').get();
  const authList = await auth.listUsers(1000);

  console.log('This will permanently delete from the LIVE myft-2025 project:');
  console.log(`  - ${usersSnap.size} Firestore user doc(s) + their Storage avatar files`);
  console.log(`  - ${leaguesSnap.size} league(s) (including rosters/picks subcollections)`);
  console.log(`  - ${authList.users.length}+ Firebase Auth account(s)`);
  console.log('This cannot be undone.\n');

  const answer = await confirm('Type "DELETE ALL" to proceed: ');
  if (answer !== 'DELETE ALL') {
    console.log('Aborted — no changes made.');
    process.exit(0);
  }

  console.log('\nDeleting leagues (and rosters/picks subcollections)...');
  for (const doc of leaguesSnap.docs) {
    await db.recursiveDelete(doc.ref);
  }
  console.log(`✅ Deleted ${leaguesSnap.size} league(s).`);

  console.log('Deleting user docs...');
  for (const doc of usersSnap.docs) {
    await db.recursiveDelete(doc.ref);
  }
  console.log(`✅ Deleted ${usersSnap.size} user doc(s).`);

  console.log('Deleting user Storage files (users/ prefix)...');
  try {
    await bucket.deleteFiles({ prefix: 'users/' });
    console.log('✅ Deleted user Storage files.');
  } catch (e) {
    console.warn('  ⚠️ Storage cleanup failed (continuing):', e.message);
  }

  console.log('Deleting Firebase Auth accounts...');
  const deletedAuthCount = await deleteAllAuthUsers();
  console.log(`✅ Deleted ${deletedAuthCount} Auth account(s).`);

  console.log('\nDone. Everyone will need to create a new account (with email/password) next time they open the app.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Script failed:', e);
  process.exit(1);
});
