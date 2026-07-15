import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const db = () => admin.firestore();
const expo = new Expo();

export async function getAllPushTokens(): Promise<string[]> {
  const snap = await db().collection('users').get();
  const tokens: string[] = [];
  snap.forEach((docSnap) => {
    const token: unknown = docSnap.data().pushToken;
    if (typeof token === 'string' && Expo.isExpoPushToken(token)) {
      tokens.push(token);
    }
  });
  return tokens;
}

/** Targeted variant of getAllPushTokens: only the given uids' tokens. */
export async function getPushTokensForUids(uids: string[]): Promise<string[]> {
  if (uids.length === 0) return [];
  const refs = uids.map((uid) => db().doc(`users/${uid}`));
  const snaps = await db().getAll(...refs);
  const tokens: string[] = [];
  for (const s of snaps) {
    const token: unknown = s.data()?.pushToken;
    if (typeof token === 'string' && Expo.isExpoPushToken(token)) {
      tokens.push(token);
    }
  }
  return tokens;
}

export async function sendPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens.map((to) => ({
    to,
    title,
    body,
    data: data ?? {},
    sound: 'default',
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (e) {
      console.error('[push] Failed to send chunk:', e);
    }
  }
}
