import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

// --- helpers ---

async function getAllPushTokens(): Promise<string[]> {
  const snap = await db.collection('users').get();
  const tokens: string[] = [];
  snap.forEach((docSnap) => {
    const token: unknown = docSnap.data().pushToken;
    if (typeof token === 'string' && Expo.isExpoPushToken(token)) {
      tokens.push(token);
    }
  });
  return tokens;
}

async function sendPush(
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

// Convert a team ID like "michigan-boys" → "Michigan", "ohio-state-boys" → "Ohio State"
function teamLabel(teamId: string): string {
  const parts = teamId.split('-');
  const last = parts[parts.length - 1];
  const nameParts =
    last === 'boys' || last === 'girls' ? parts.slice(0, -1) : parts;
  return nameParts
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

// --- Cloud Functions ---

export const onGameUpdate = onDocumentUpdated('games/{gameId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  if ((after.status ?? '').toLowerCase() !== 'live') return;

  const s1Before = Number(before.team1score ?? 0);
  const s2Before = Number(before.team2score ?? 0);
  const s1After = Number(after.team1score ?? 0);
  const s2After = Number(after.team2score ?? 0);

  if (s1Before === s1After && s2Before === s2After) return;

  const wasTied = s1Before === s2Before;
  const isTied = s1After === s2After;
  const t1WasLeading = s1Before > s2Before;
  const t1IsLeading = s1After > s2After;
  const leadFlipped = !isTied && t1WasLeading !== t1IsLeading;

  if (!leadFlipped && !(isTied && !wasTied)) return;

  const t1 = teamLabel(String(after.team1ID ?? 'Team 1'));
  const t2 = teamLabel(String(after.team2ID ?? 'Team 2'));
  const scoreStr = `${s1After}–${s2After}`;

  let title: string;
  let body: string;

  if (isTied && !wasTied) {
    title = 'Tied Game!';
    body = `${t1} ${scoreStr} ${t2}`;
  } else {
    const leader = t1IsLeading ? t1 : t2;
    title = 'Lead Change!';
    body = `${leader} takes the lead  •  ${t1} ${scoreStr} ${t2}`;
  }

  const tokens = await getAllPushTokens();
  await sendPush(tokens, title, body);
});

export const sendEventReminders = onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'America/New_York' },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const windowStart = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 10 * 60 * 1000
    );
    const windowEnd = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 20 * 60 * 1000
    );

    const snap = await db
      .collection('schedule')
      .where('startAt', '>=', windowStart)
      .where('startAt', '<=', windowEnd)
      .get();

    if (snap.empty) return;

    const tokens = await getAllPushTokens();
    if (tokens.length === 0) return;

    const batch = db.batch();

    for (const eventDoc of snap.docs) {
      const eventData = eventDoc.data();

      if (eventData.reminderSentAt) continue;

      const title = 'Starting Soon';
      const body = `${eventData.title} begins in ~15 minutes at ${eventData.location}`;

      await sendPush(tokens, title, body, { eventId: eventDoc.id });

      batch.update(eventDoc.ref, {
        reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
  }
);
