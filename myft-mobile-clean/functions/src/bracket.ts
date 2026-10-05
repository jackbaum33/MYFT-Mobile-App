import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

const db = () => admin.firestore();

// --- Types ---

export type Division = 'boys' | 'girls';

export type BracketSlot = {
  slotIndex: number;
  seed1?: number;
  seed2?: number;
  team1ID?: string | null;
  team2ID?: string | null;
  gameId: string;
  isBye: boolean;
  winnerTeamID?: string | null;
  advancesToRound?: number;
  advancesToSlot?: number;
  advancesToSide?: 'team1' | 'team2';
};

export type BracketRound = {
  roundIndex: number;
  label: string;
  slots: BracketSlot[];
};

export type BracketDoc = {
  division: Division;
  size: number;
  qualifyingTeamCount: number;
  seeds: { seed: number; teamID: string }[];
  rounds: BracketRound[];
  status: 'generated' | 'complete';
  generatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  sourceStandings: { teamID: string; wins: number; losses: number; pointDifferential: number; seed: number }[];
};

// --- Cloud Functions ---

/**
 * Fires when a bracket game (has a `round` field, not a bye) reaches Final.
 * Determines the winner by score, records it on the `brackets/{division}` slot,
 * and — unless this was the Final — writes the winner into the next round's
 * `games` doc, flipping its status from TBD to Scheduled once both teams are
 * known. A single Firestore transaction keeps the bracket doc and the
 * destination game doc consistent, and is idempotent (re-firing on the same
 * transition is a no-op once the winner is already recorded).
 *
 * Bracket GENERATION is manual now (admin panel's "Generate Bracket" button,
 * which writes brackets/{division} + the games docs directly) — there used to
 * be a generateBracketOnPoolComplete trigger here that did this automatically
 * once every pool game in a division went Final; it was removed in favor of
 * letting the admin decide when to generate. This function only handles
 * advancing an already-generated bracket round to round.
 */
export const advanceBracketOnGameFinal = onDocumentUpdated('games/{gameId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  if (after.round === undefined || after.isBye === true) return; // only real bracket games

  const beforeFinal = String(before.status ?? '').toLowerCase() === 'final';
  const afterFinal = String(after.status ?? '').toLowerCase() === 'final';
  if (beforeFinal || !afterFinal) return;

  const division = after.division as Division | undefined;
  const round = after.round as number | undefined;
  const bracketSlot = after.bracketSlot as number | undefined;
  if (!division || round === undefined || bracketSlot === undefined) return;

  const score1 = Number(after.team1score ?? 0);
  const score2 = Number(after.team2score ?? 0);
  if (score1 === score2) {
    console.error(
      `[advanceBracketOnGameFinal] tie score on ${division} round ${round} slot ${bracketSlot} (${event.params.gameId}) — refusing to advance, fix the score manually`
    );
    return;
  }
  const winnerTeamID = score1 > score2 ? String(after.team1ID ?? '') : String(after.team2ID ?? '');
  if (!winnerTeamID) return;

  const bracketRef = db().doc(`brackets/${division}`);

  await db().runTransaction(async (tx) => {
    const bracketSnap = await tx.get(bracketRef);
    if (!bracketSnap.exists) return;
    const bracket = bracketSnap.data() as BracketDoc;

    const roundData = bracket.rounds.find((r) => r.roundIndex === round);
    const slot = roundData?.slots.find((s) => s.slotIndex === bracketSlot);
    if (!roundData || !slot) return;
    if (slot.winnerTeamID === winnerTeamID) return; // idempotent no-op

    const hasNextRound = slot.advancesToRound !== undefined;
    const destRef = hasNextRound
      ? db().doc(`games/bracket-${division}-r${slot.advancesToRound}-s${slot.advancesToSlot}`)
      : undefined;
    const destSnap = destRef ? await tx.get(destRef) : undefined;

    const newRounds = bracket.rounds.map((r) => {
      if (r.roundIndex === round) {
        return {
          ...r,
          slots: r.slots.map((s) => (s.slotIndex === bracketSlot ? { ...s, winnerTeamID } : s)),
        };
      }
      if (hasNextRound && r.roundIndex === slot.advancesToRound) {
        return {
          ...r,
          slots: r.slots.map((s) =>
            s.slotIndex === slot.advancesToSlot
              ? { ...s, [slot.advancesToSide === 'team1' ? 'team1ID' : 'team2ID']: winnerTeamID }
              : s
          ),
        };
      }
      return r;
    });

    if (!destRef) {
      tx.update(bracketRef, { rounds: newRounds, status: 'complete' });
      console.log(`[advanceBracketOnGameFinal] ${division} bracket complete — champion ${winnerTeamID}`);
      return;
    }

    tx.update(bracketRef, { rounds: newRounds });

    if (destSnap && destSnap.exists) {
      const destData = destSnap.data() as Record<string, unknown>;
      const sideField = slot.advancesToSide === 'team1' ? 'team1ID' : 'team2ID';
      const otherField = slot.advancesToSide === 'team1' ? 'team2ID' : 'team1ID';
      const bothKnown = !!destData[otherField];
      tx.update(destRef, { [sideField]: winnerTeamID, status: bothKnown ? 'Scheduled' : 'TBD' });
    }
  });
});
