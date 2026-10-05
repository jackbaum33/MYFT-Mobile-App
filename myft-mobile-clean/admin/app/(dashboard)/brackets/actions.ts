"use server";

import { revalidatePath } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { requireSession } from "@/lib/session";
import type { BracketDoc, Division, TeamDoc, TournamentConfig } from "@/lib/types";
import { parseRecord, parseDateTimeLocal } from "@/lib/utils";
import { buildBracket, rankStandings, stripUndefined, type TeamStanding } from "@/lib/bracketBuilder";

/**
 * Builds the playoff bracket from teams' CURRENT records/point differential and writes
 * brackets/{division} plus every round's games docs. This is the only way a bracket gets
 * created — there's no automatic trigger — so generate it once pool play is actually done
 * (or earlier, for testing; delete and regenerate with deleteBracket if standings change).
 */
export async function generateBracket(division: Division, formData: FormData): Promise<void> {
  await requireSession();

  const existing = await db.doc(`brackets/${division}`).get();
  if (existing.exists) {
    throw new Error("A bracket already exists for this division — delete it first if you want to regenerate.");
  }

  const countRaw = Number(formData.get("count") ?? 0);

  const teamsSnap = await db.collection("teams").where("division", "==", division).get();
  const standings: TeamStanding[] = teamsSnap.docs.map((d) => {
    const data = d.data() as TeamDoc;
    const { wins, losses } = parseRecord(data.record);
    return { teamID: d.id, name: data.name ?? d.id, wins, losses, pointDifferential: data.pointDifferential ?? 0 };
  });
  if (standings.length === 0) throw new Error(`No ${division} teams found.`);

  const ranked = rankStandings(standings);
  const count = countRaw > 0 ? Math.min(countRaw, ranked.length) : ranked.length;
  const qualifiers = ranked.slice(0, count);
  if (qualifiers.length < 2) throw new Error("Need at least 2 teams to build a bracket.");

  // Same Saturday Date used by the real generator (config/tournament, set on the Config
  // page) — without a startTime, these games have no date at all and the schedule's
  // `orderBy('startTime')` query silently excludes them, so they never show up in the app.
  const configSnap = await db.doc("config/tournament").get();
  const saturdayDate = (configSnap.data() as TournamentConfig | undefined)?.saturdayDate;
  const startTime = saturdayDate ? Timestamp.fromDate(parseDateTimeLocal(`${saturdayDate}T00:00`)) : undefined;

  const seeds = qualifiers.map((t, i) => ({ seed: i + 1, teamID: t.teamID }));
  const { bracket, games } = buildBracket(division, seeds, startTime);

  const batch = db.batch();
  batch.set(
    db.doc(`brackets/${division}`),
    stripUndefined({
      ...bracket,
      generatedAt: FieldValue.serverTimestamp(),
      sourceStandings: ranked.map((t, i) => ({
        teamID: t.teamID,
        wins: t.wins,
        losses: t.losses,
        pointDifferential: t.pointDifferential,
        seed: i + 1,
      })),
    })
  );
  for (const g of games) {
    const { docId, ...rest } = g;
    batch.set(db.doc(`games/${docId}`), stripUndefined(rest));
  }
  await batch.commit();

  revalidatePath("/brackets");
  revalidatePath("/games");
}

/** Deletes a generated bracket and every game doc it created, so it can be regenerated. */
export async function deleteBracket(division: Division): Promise<void> {
  await requireSession();

  const ref = db.doc(`brackets/${division}`);
  const snap = await ref.get();
  if (!snap.exists) return;
  const bracket = snap.data() as BracketDoc;

  const batch = db.batch();
  batch.delete(ref);
  for (const round of bracket.rounds) {
    for (const slot of round.slots) {
      batch.delete(db.doc(`games/${slot.gameId}`));
    }
  }
  await batch.commit();

  revalidatePath("/brackets");
  revalidatePath("/games");
}

/** Manual correction: overrides a bracket slot's teams and mirrors it onto the matching games doc. */
export async function overrideSlot(
  division: string,
  roundIndex: number,
  slotIndex: number,
  formData: FormData
): Promise<void> {
  await requireSession();

  const team1ID = String(formData.get("team1ID") ?? "").trim();
  const team2ID = String(formData.get("team2ID") ?? "").trim();

  const ref = db.doc(`brackets/${division}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Bracket not generated yet");
  const bracket = snap.data() as BracketDoc;

  let gameId: string | undefined;
  const newRounds = bracket.rounds.map((r) => {
    if (r.roundIndex !== roundIndex) return r;
    return {
      ...r,
      slots: r.slots.map((s) => {
        if (s.slotIndex !== slotIndex) return s;
        gameId = s.gameId;
        return { ...s, team1ID: team1ID || null, team2ID: team2ID || null };
      }),
    };
  });

  await ref.update({ rounds: newRounds });

  if (gameId) {
    const bothKnown = !!team1ID && !!team2ID;
    await db.doc(`games/${gameId}`).update({
      team1ID: team1ID || FieldValue.delete(),
      team2ID: team2ID || FieldValue.delete(),
      status: bothKnown ? "Scheduled" : "TBD",
    });
  }

  revalidatePath("/brackets");
  revalidatePath("/games");
}
