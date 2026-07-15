"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { requireSession } from "@/lib/session";

function numOrDelete(formData: FormData, key: string): number | FieldValue {
  const raw = String(formData.get(key) ?? "").trim();
  return raw === "" ? FieldValue.delete() : Number(raw);
}

function strOrDelete(formData: FormData, key: string): string | FieldValue {
  const raw = String(formData.get(key) ?? "").trim();
  return raw === "" ? FieldValue.delete() : raw;
}

export async function createGame(formData: FormData): Promise<void> {
  await requireSession();

  const team1ID = String(formData.get("team1ID") ?? "");
  const team2ID = String(formData.get("team2ID") ?? "");
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
  if (startTimeRaw) data.startTime = Timestamp.fromDate(new Date(startTimeRaw));

  const ref = await db.collection("games").add(data);
  revalidatePath("/games");
  redirect(`/games/${ref.id}`);
}

export async function updateGame(gameId: string, formData: FormData): Promise<void> {
  await requireSession();

  const startTimeRaw = String(formData.get("startTime") ?? "").trim();
  const isBye = formData.get("isBye") === "on";

  const update: Record<string, unknown> = {
    team1ID: String(formData.get("team1ID") ?? ""),
    team2ID: String(formData.get("team2ID") ?? ""),
    status: String(formData.get("status") ?? "Scheduled"),
    team1score: Number(formData.get("team1score") ?? 0),
    team2score: Number(formData.get("team2score") ?? 0),
    field: strOrDelete(formData, "field"),
    startTime: startTimeRaw ? Timestamp.fromDate(new Date(startTimeRaw)) : FieldValue.delete(),
    // Bracket / playoff fields — manual correction surface.
    round: numOrDelete(formData, "round"),
    roundLabel: strOrDelete(formData, "roundLabel"),
    division: strOrDelete(formData, "division"),
    bracketSlot: numOrDelete(formData, "bracketSlot"),
    seed1: numOrDelete(formData, "seed1"),
    seed2: numOrDelete(formData, "seed2"),
    isBye,
  };

  await db.doc(`games/${gameId}`).update(update);
  revalidatePath(`/games/${gameId}`);
  revalidatePath("/games");
}

export async function markFinal(gameId: string): Promise<void> {
  await requireSession();
  await db.doc(`games/${gameId}`).update({ status: "Final" });
  revalidatePath(`/games/${gameId}`);
  revalidatePath("/games");
}

export async function updatePlayerStats(gameId: string, formData: FormData): Promise<void> {
  await requireSession();

  const perPlayer: Record<string, number[]> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("stat_")) continue;
    const rest = key.slice("stat_".length);
    const lastUnderscore = rest.lastIndexOf("_");
    const playerId = rest.slice(0, lastUnderscore);
    const idx = Number(rest.slice(lastUnderscore + 1));
    if (!perPlayer[playerId]) perPlayer[playerId] = Array(11).fill(0);
    perPlayer[playerId][idx] = Number(value) || 0;
  }

  const update: Record<string, unknown> = {};
  for (const [playerId, arr] of Object.entries(perPlayer)) {
    update[`playerStats.${playerId}`] = arr;
  }
  if (Object.keys(update).length > 0) {
    await db.doc(`games/${gameId}`).update(update);
  }
  revalidatePath(`/games/${gameId}`);
}

export async function deleteGame(gameId: string): Promise<void> {
  await requireSession();
  await db.doc(`games/${gameId}`).delete();
  revalidatePath("/games");
  redirect("/games");
}
