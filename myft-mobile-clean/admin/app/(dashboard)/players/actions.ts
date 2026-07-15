"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { db, bucket } from "@/lib/firebaseAdmin";
import { requireSession } from "@/lib/session";
import { slugify, playerImagePath } from "@/lib/utils";

async function uploadPlayerPhoto(playerId: string, file: File): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const gcsFile = bucket.file(playerImagePath(playerId));
  await gcsFile.save(buffer, {
    contentType: file.type || "image/jpeg",
    metadata: { cacheControl: "public, max-age=31536000" },
  });
  // getPlayerImageUrl() in the app builds a tokenless `...?alt=media` URL, so the
  // object must be genuinely public (not just a signed getDownloadURL() token).
  await gcsFile.makePublic();
}

export async function createPlayer(formData: FormData): Promise<void> {
  await requireSession();

  const name = String(formData.get("name") ?? "").trim();
  const teamId = String(formData.get("teamId") ?? "");
  const requestedId = String(formData.get("id") ?? "").trim();
  const intent = String(formData.get("intent") ?? "save");
  const photo = formData.get("photo");

  if (!name) throw new Error("Name is required");

  const base = requestedId ? slugify(requestedId) : slugify(name);
  let id = base;
  let n = 2;
  while ((await db.doc(`players/${id}`).get()).exists) {
    id = `${base}-${n}`;
    n++;
  }

  const data: Record<string, unknown> = {
    display_name: name,
    seasonTotals: Array(11).fill(0),
  };
  if (teamId) data.team_id = teamId;

  await db.doc(`players/${id}`).set(data);

  if (photo instanceof File && photo.size > 0) {
    await uploadPlayerPhoto(id, photo);
  }

  revalidatePath("/players");
  if (teamId) revalidatePath(`/teams/${teamId}`);

  if (intent === "saveAndAddAnother") {
    const qs = teamId ? `?teamId=${teamId}&created=${id}` : `?created=${id}`;
    redirect(`/players/new${qs}`);
  }
  redirect(`/players/${id}`);
}

export async function updatePlayer(playerId: string, formData: FormData): Promise<void> {
  await requireSession();

  const teamId = String(formData.get("teamId") ?? "").trim();
  const photo = formData.get("photo");

  const update: Record<string, unknown> = {
    display_name: String(formData.get("name") ?? "").trim(),
    team_id: teamId || FieldValue.delete(),
  };

  const seasonTotals: number[] = [];
  for (let i = 0; i < 11; i++) {
    seasonTotals.push(Number(formData.get(`season_${i}`) ?? 0));
  }
  update.seasonTotals = seasonTotals;

  await db.doc(`players/${playerId}`).update(update);

  if (photo instanceof File && photo.size > 0) {
    await uploadPlayerPhoto(playerId, photo);
  }

  revalidatePath(`/players/${playerId}`);
  revalidatePath("/players");
  if (teamId) revalidatePath(`/teams/${teamId}`);
}

export async function deletePlayer(playerId: string): Promise<void> {
  await requireSession();
  await db.doc(`players/${playerId}`).delete();
  revalidatePath("/players");
  redirect("/players");
}
