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
    const { wins, losses, ties } = parseRecord(data.record);
    return { teamID: d.id, name: data.name ?? d.id, wins, losses, ties, pointDifferential: data.pointDifferential ?? 0 };
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
        ties: t.ties,
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

/**
 * The Brackets page's single control surface for a playoff game: teams, time, field,
 * status, and score all save together from one form. "Mark Final" (intent=final) forces
 * status to Final after checking the score isn't tied; the existing advanceBracketOnGameFinal
 * Cloud Function is what actually detects that Final transition and writes the winner into
 * the next round's slot — this action doesn't duplicate that logic, just sets the status.
 */
export async function updateBracketGame(
  division: string,
  roundIndex: number,
  slotIndex: number,
  formData: FormData
): Promise<void> {
  await requireSession();

  const team1ID = String(formData.get("team1ID") ?? "").trim();
  const team2ID = String(formData.get("team2ID") ?? "").trim();
  const field = String(formData.get("field") ?? "").trim();
  const timeRaw = String(formData.get("time") ?? "").trim();
  const team1score = Number(formData.get("team1score") ?? 0) || 0;
  const team2score = Number(formData.get("team2score") ?? 0) || 0;
  const selectedStatus = String(formData.get("status") ?? "Scheduled");
  const markFinal = String(formData.get("intent") ?? "") === "final";

  if (markFinal && team1score === team2score) {
    throw new Error("Scores are tied — fix the score before marking this game Final.");
  }

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
  if (!gameId) return;

  const update: Record<string, unknown> = {
    team1ID: team1ID || FieldValue.delete(),
    team2ID: team2ID || FieldValue.delete(),
    team1score,
    team2score,
    status: markFinal ? "Final" : selectedStatus,
    field: field || FieldValue.delete(),
  };

  if (timeRaw) {
    const configSnap = await db.doc("config/tournament").get();
    const saturdayDate = (configSnap.data() as TournamentConfig | undefined)?.saturdayDate;
    if (!saturdayDate) {
      throw new Error("Set a Saturday Date on Config first — bracket game times are relative to that day.");
    }
    update.startTime = Timestamp.fromDate(parseDateTimeLocal(`${saturdayDate}T${timeRaw}`));
  }

  await db.doc(`games/${gameId}`).update(update);

  revalidatePath("/brackets");
  revalidatePath("/games");
}
