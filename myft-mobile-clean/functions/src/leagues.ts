import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getPushTokensForUids, sendPush } from './push';

// --- Types (duplicated from the client — functions/ has no shared package with app/) ---

export type DraftStyle = 'snake' | 'linear';
export type LeagueStatus = 'pending' | 'drafting' | 'complete';

export type LeagueDoc = {
  name: string;
  ownerUid: string;
  memberUids: string[];
  boysPerTeam: number;
  girlsPerTeam: number;
  draftStyle: DraftStyle;
  scheduledStart: FirebaseFirestore.Timestamp;
  status: LeagueStatus;
  draftOrder?: string[];
  currentPickNumber?: number;
  totalPicks?: number;
  draftedPlayerIds?: string[];
  createdAt: FirebaseFirestore.Timestamp;
};

/**
 * Standard snake-fantasy-draft turn order: pick n's turn is n % numMembers,
 * reversed on odd rounds when draftStyle is 'snake'. Division/roster-slot
 * needs never affect whose turn it is — see the plan's "Draft mechanics"
 * section for why turn count and slot count always stay in sync.
 */
export function pickerForNumber(
  league: Pick<LeagueDoc, 'draftOrder' | 'draftStyle'>,
  pickNumber: number
): string | undefined {
  const order = league.draftOrder;
  if (!order || order.length === 0) return undefined;
  const n = order.length;
  const round = Math.floor(pickNumber / n);
  const idx = pickNumber % n;
  const reversed = league.draftStyle === 'snake' && round % 2 === 1;
  return reversed ? order[n - 1 - idx] : order[idx];
}

/**
 * Fires when a league is created. Notifies every member except the owner
 * (who already knows — they just created it) that they've been added.
 */
export const notifyLeagueCreated = onDocumentCreated('leagues/{leagueId}', async (event) => {
  const league = event.data?.data() as LeagueDoc | undefined;
  if (!league) return;

  const notifyUids = league.memberUids.filter((uid) => uid !== league.ownerUid);
  if (notifyUids.length === 0) return;

  const tokens = await getPushTokensForUids(notifyUids);
  await sendPush(tokens, 'Added to a League', `You've been added to "${league.name}"`, {
    leagueId: event.params.leagueId,
  });
});

/**
 * Fires on every league update. Notifies whoever is now on the clock when
 * the draft starts (pending -> drafting) or advances a pick, and notifies
 * every member once the draft completes.
 */
export const notifyDraftTurn = onDocumentUpdated('leagues/{leagueId}', async (event) => {
  const before = event.data?.before.data() as LeagueDoc | undefined;
  const after = event.data?.after.data() as LeagueDoc | undefined;
  if (!before || !after) return;

  const leagueId = event.params.leagueId;

  // Draft just started -> notify the first picker.
  if (before.status !== 'drafting' && after.status === 'drafting') {
    const picker = pickerForNumber(after, 0);
    if (picker) {
      const tokens = await getPushTokensForUids([picker]);
      await sendPush(tokens, 'Your Pick', `It's your pick in "${after.name}"!`, { leagueId });
    }
    return;
  }

  // Draft just completed -> notify everyone.
  if (before.status !== 'complete' && after.status === 'complete') {
    const tokens = await getPushTokensForUids(after.memberUids);
    await sendPush(tokens, 'Draft Complete', `The draft for "${after.name}" has finished!`, { leagueId });
    return;
  }

  // A pick advanced mid-draft -> notify the new picker.
  if (
    after.status === 'drafting' &&
    before.currentPickNumber !== after.currentPickNumber &&
    after.currentPickNumber !== undefined &&
    after.currentPickNumber !== after.totalPicks
  ) {
    const picker = pickerForNumber(after, after.currentPickNumber);
    if (picker) {
      const tokens = await getPushTokensForUids([picker]);
      await sendPush(tokens, 'Your Pick', `It's your pick in "${after.name}"!`, { leagueId });
    }
  }
});
