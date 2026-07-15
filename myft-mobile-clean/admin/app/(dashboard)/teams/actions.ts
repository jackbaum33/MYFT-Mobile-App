"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { requireSession } from "@/lib/session";
import { slugify } from "@/lib/utils";
import type { GameDoc } from "@/lib/types";

export async function createTeam(formData: FormData): Promise<void> {
  await requireSession();

  const name = String(formData.get("name") ?? "").trim();
  const division = String(formData.get("division") ?? "boys");
  const captain = String(formData.get("captain") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const base = `${slugify(name)}-${division}`;
  let id = base;
  let n = 2;
  while ((await db.doc(`teams/${id}`).get()).exists) {
    id = `${base}-${n}`;
    n++;
  }

  await db.doc(`teams/${id}`).set({
    name,
    division,
    captain_name: captain,
    record: { wins: 0, losses: 0 },
    pointDifferential: 0,
  });

  revalidatePath("/teams");
  redirect(`/teams/${id}`);
}

export async function updateTeamMeta(teamId: string, formData: FormData): Promise<void> {
  await requireSession();

  await db.doc(`teams/${teamId}`).update({
    name: String(formData.get("name") ?? "").trim(),
    captain_name: String(formData.get("captain") ?? "").trim(),
    record: {
      wins: Number(formData.get("wins") ?? 0),
      losses: Number(formData.get("losses") ?? 0),
    },
    pointDifferential: Number(formData.get("pointDifferential") ?? 0),
  });

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
}

/** Recomputes wins/losses/pointDifferential from Final pool-play games. */
export async function recomputeTeamRecord(teamId: string): Promise<void> {
  await requireSession();

  const gamesSnap = await db.collection("games").get();
  let wins = 0;
  let losses = 0;
  let pointDifferential = 0;

  gamesSnap.forEach((doc) => {
    const g = doc.data() as GameDoc;
    if (g.round !== undefined) return; // pool games only
    if ((g.status ?? "").toLowerCase() !== "final") return;
    const isTeam1 = g.team1ID === teamId;
    const isTeam2 = g.team2ID === teamId;
    if (!isTeam1 && !isTeam2) return;

    const own = (isTeam1 ? g.team1score : g.team2score) ?? 0;
    const opp = (isTeam1 ? g.team2score : g.team1score) ?? 0;
    pointDifferential += own - opp;
    if (own > opp) wins++;
    else if (own < opp) losses++;
  });

  await db.doc(`teams/${teamId}`).update({ record: { wins, losses }, pointDifferential });
  revalidatePath(`/teams/${teamId}`);
}

export async function addPlayerToTeam(teamId: string, formData: FormData): Promise<void> {
  await requireSession();
  const playerId = String(formData.get("playerId") ?? "");
  if (!playerId) return;
  await db.doc(`players/${playerId}`).update({ team_id: teamId });
  revalidatePath(`/teams/${teamId}`);
}

export async function removePlayerFromTeam(teamId: string, playerId: string): Promise<void> {
  await requireSession();
  await db.doc(`players/${playerId}`).update({ team_id: FieldValue.delete() });
  revalidatePath(`/teams/${teamId}`);
}

export async function deleteTeam(teamId: string): Promise<void> {
  await requireSession();
  await db.doc(`teams/${teamId}`).delete();
  revalidatePath("/teams");
  redirect("/teams");
}
