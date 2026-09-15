"use server";

// Deliberately public — no requireSession() — this route is meant to be filled out
// by players themselves, unlike everything under app/(dashboard).

import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebaseAdmin";
import { uploadPlayerPhoto } from "@/lib/photo";

// Vercel Functions hard-cap request bodies at 4.5MB regardless of the Next.js
// serverActions.bodySizeLimit config; stay comfortably under that. The client
// already downscales/compresses (see UploadForm.tsx) — this is just a backstop.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export async function submitPlayerPhoto(formData: FormData): Promise<void> {
  const playerId = String(formData.get("playerId") ?? "").trim();
  const photo = formData.get("photo");

  if (!playerId) throw new Error("Select your name first.");
  if (!(photo instanceof File) || photo.size === 0) throw new Error("Choose a photo to upload.");
  if (!photo.type.startsWith("image/")) throw new Error("File must be an image.");
  if (photo.size > MAX_PHOTO_BYTES) throw new Error("Image is too large — please choose a smaller photo.");

  // Only allow writes for players that actually exist, since this endpoint is unauthenticated.
  const playerSnap = await db.doc(`players/${playerId}`).get();
  if (!playerSnap.exists) throw new Error("Unknown player — please pick a name from the list.");

  await uploadPlayerPhoto(playerId, photo, { source: "self" });

  revalidatePath("/upload-photo");
  revalidatePath(`/players/${playerId}`);
  revalidatePath("/players");
  revalidatePath("/");
}
