"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { requireSession } from "@/lib/session";
import { STAT_FIELDS, type GameDoc, type PlayerDoc } from "@/lib/types";
import { parseDateTimeLocal } from "@/lib/utils";
import { recomputeTeamRecord } from "../teams/actions";

const STAT_INDEX: Record<string, number> = Object.fromEntries(STAT_FIELDS.map((f, i) => [f.key, i]));

function numOrDelete(formData: FormData, key: string): number | FieldValue {
  const raw = String(formData.get(key) ?? "").trim();
  return raw === "" ? FieldValue.delete() : Number(raw);
}

function strOrDelete(formData: FormData, key: string): string | FieldValue {
  const raw = String(formData.get(key) ?? "").trim();
  return raw === "" ? FieldValue.delete() : raw;
}

/**
 * team1ID/team2ID are plain strings, not foreign keys the app validates — every screen
 * that resolves a team name already falls back to showing the raw ID verbatim when it
 * doesn't match a real team. So a free-typed placeholder (e.g. "Boys 1 Seed") renders
 * fine with zero app changes; this just lets admins type one instead of picking a team,
 * for playoff slots where the real team isn't decided yet.
 */
function teamIdFromForm(formData: FormData, selectKey: string, placeholderKey: string): string {
  const placeholder = String(formData.get(placeholderKey) ?? "").trim();
  return placeholder || String(formData.get(selectKey) ?? "").trim();
}

/**
 * Keeps both teams' win/loss/tie/point-differential in sync with a pool game's result.
 * Called wherever a game can end up Final (Mark Final, Save, or a historical backfill
 * created as Final) — not a background trigger, just invoked directly from those actions,
 * so it only ever runs as a direct result of an admin action. Bracket/playoff games
 * (round !== undefined) never affect these — same convention as recomputeTeamRecord itself.
 */
async function syncTeamRecordsIfFinal(game: Pick<GameDoc, "round" | "status" | "team1ID" | "team2ID">): Promise<void> {
  if (game.round !== undefined) return;
  if ((game.status ?? "").toLowerCase() !== "final") return;
  const teamIds = [game.team1ID, game.team2ID].filter((v): v is string => !!v);
  await Promise.all(teamIds.map((id) => recomputeTeamRecord(id)));
}

export async function createGame(formData: FormData): Promise<void> {
  await requireSession();

  const team1ID = teamIdFromForm(formData, "team1ID", "team1Placeholder");
  const team2ID = teamIdFromForm(formData, "team2ID", "team2Placeholder");
  const status = String(formData.get("status") ?? "Scheduled");
  const field = String(formData.get("field") ?? "").trim();
  const startTimeRaw = String(formData.get("startTime") ?? "");

  if (!team1ID || !team2ID) throw new Error("Both teams are required");

  const data: Record<string, unknown> = {
    team1ID,
    team2ID,
    team1score: 0,
    team2score: 0,
    status,
    playerStats: {},
  };
  if (field) data.field = field;
  if (startTimeRaw) data.startTime = Timestamp.fromDate(parseDateTimeLocal(startTimeRaw));

  const ref = await db.collection("games").add(data);
  await syncTeamRecordsIfFinal({ status, team1ID, team2ID }); // handles a backfilled game created as Final
  revalidatePath("/games");
  redirect(`/games/${ref.id}`);
}

export async function updateGame(gameId: string, formData: FormData): Promise<void> {
  await requireSession();

  const team1ID = teamIdFromForm(formData, "team1ID", "team1Placeholder");
  const team2ID = teamIdFromForm(formData, "team2ID", "team2Placeholder");
  const status = String(formData.get("status") ?? "Scheduled");
  const startTimeRaw = String(formData.get("startTime") ?? "").trim();
  const isBye = formData.get("isBye") === "on";
  const roundRaw = String(formData.get("round") ?? "").trim();

  const update: Record<string, unknown> = {
    team1ID,
    team2ID,
    status,
    team1score: Number(formData.get("team1score") ?? 0),
    team2score: Number(formData.get("team2score") ?? 0),
    field: strOrDelete(formData, "field"),
    startTime: startTimeRaw ? Timestamp.fromDate(parseDateTimeLocal(startTimeRaw)) : FieldValue.delete(),
    // Bracket / playoff fields — manual correction surface.
    round: roundRaw === "" ? FieldValue.delete() : Number(roundRaw),
    roundLabel: strOrDelete(formData, "roundLabel"),
    division: strOrDelete(formData, "division"),
    bracketSlot: numOrDelete(formData, "bracketSlot"),
    seed1: numOrDelete(formData, "seed1"),
    seed2: numOrDelete(formData, "seed2"),
    isBye,
  };

  await db.doc(`games/${gameId}`).update(update);
  await syncTeamRecordsIfFinal({
    round: roundRaw === "" ? undefined : Number(roundRaw),
    status,
    team1ID,
    team2ID,
  }); // covers both marking Final here and correcting a score on an already-Final game

  revalidatePath(`/games/${gameId}`);
  revalidatePath("/games");
}

export async function markFinal(gameId: string): Promise<void> {
  await requireSession();
  const ref = db.doc(`games/${gameId}`);
  await ref.update({ status: "Final" });

  const snap = await ref.get();
  const game = snap.data() as GameDoc | undefined;
  if (game) await syncTeamRecordsIfFinal(game);

  revalidatePath(`/games/${gameId}`);
  revalidatePath("/games");
}

/**
 * Logs one or more simultaneous plays (e.g. a sack paired with an interception on the
 * same snap): applies each as a +1 to the relevant player's cumulative game stat and
 * records a row in games/{gameId}/playLog for the live ledger view. Rows are indexed
 * playerId_0/statKey_0, playerId_1/statKey_1, ... per the `rowCount` field, submitted
 * by the client component (PlayLogForm.tsx).
 */
export async function addPlayLogEntries(gameId: string, formData: FormData): Promise<void> {
  await requireSession();

  const rowCount = Number(formData.get("rowCount") ?? 0);
  const rows: { playerId: string; statKey: string }[] = [];
  for (let i = 0; i < rowCount; i++) {
    const playerId = String(formData.get(`playerId_${i}`) ?? "").trim();
    const statKey = String(formData.get(`statKey_${i}`) ?? "").trim();
    if (playerId && statKey && STAT_INDEX[statKey] !== undefined) {
      rows.push({ playerId, statKey });
    }
  }
  if (rows.length === 0) return;

  const uniquePlayerIds = [...new Set(rows.map((r) => r.playerId))];
  const playerDocs = await Promise.all(uniquePlayerIds.map((pid) => db.doc(`players/${pid}`).get()));
  const nameById = new Map(
    playerDocs.map((d) => [d.id, (d.data() as PlayerDoc | undefined)?.display_name ?? d.id])
  );

  for (const row of rows) {
    const statIndex = STAT_INDEX[row.statKey];
    await db.runTransaction(async (tx) => {
      const gameRef = db.doc(`games/${gameId}`);
      const gameSnap = await tx.get(gameRef);
      const game = gameSnap.data() as GameDoc | undefined;
      const current = [...(game?.playerStats?.[row.playerId] ?? Array(11).fill(0))];
      current[statIndex] = (current[statIndex] ?? 0) + 1;

      tx.update(gameRef, { [`playerStats.${row.playerId}`]: current });
      tx.set(db.collection(`games/${gameId}/playLog`).doc(), {
        playerId: row.playerId,
        playerName: nameById.get(row.playerId) ?? row.playerId,
        statKey: row.statKey,
        delta: 1,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  }

  revalidatePath(`/games/${gameId}`);
}

/** Reverses a logged play: decrements the stat it added and removes the ledger row. */
export async function deletePlayLogEntry(
  gameId: string,
  entryId: string,
  playerId: string,
  statKey: string,
  delta: number
): Promise<void> {
  await requireSession();

  const statIndex = STAT_INDEX[statKey];
  if (statIndex === undefined) return;

  await db.runTransaction(async (tx) => {
    const gameRef = db.doc(`games/${gameId}`);
    const gameSnap = await tx.get(gameRef);
    const game = gameSnap.data() as GameDoc | undefined;
    const current = [...(game?.playerStats?.[playerId] ?? Array(11).fill(0))];
    current[statIndex] = Math.max(0, (current[statIndex] ?? 0) - delta);

    tx.update(gameRef, { [`playerStats.${playerId}`]: current });
    tx.delete(db.doc(`games/${gameId}/playLog/${entryId}`));
  });

  revalidatePath(`/games/${gameId}`);
}

export async function deleteGame(gameId: string): Promise<void> {
  await requireSession();
  await db.doc(`games/${gameId}`).delete();
  revalidatePath("/games");
  redirect("/games");
}
