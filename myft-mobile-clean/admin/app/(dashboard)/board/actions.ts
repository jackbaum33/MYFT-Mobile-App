"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, bucket } from "@/lib/firebaseAdmin";
import { requireSession } from "@/lib/session";
import { slugify, boardImagePath } from "@/lib/utils";

async function uploadBoardPhoto(memberId: string, file: File): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const gcsFile = bucket.file(boardImagePath(memberId));
  await gcsFile.save(buffer, {
    contentType: file.type || "image/jpeg",
    metadata: { cacheControl: "public, max-age=31536000" },
  });
  // The app builds a tokenless `...?alt=media` URL directly, so the object
  // must be genuinely public (mirrors players/actions.ts).
  await gcsFile.makePublic();
}

export async function createBoardMember(formData: FormData): Promise<void> {
  await requireSession();

  const name = String(formData.get("name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const order = Number(formData.get("order") ?? 0);
  const photo = formData.get("photo");

  if (!name) throw new Error("Name is required");

  const base = slugify(name);
  let id = base;
  let n = 2;
  while ((await db.doc(`boardMembers/${id}`).get()).exists) {
    id = `${base}-${n}`;
    n++;
  }

  await db.doc(`boardMembers/${id}`).set({ name, title, email, order });

  if (photo instanceof File && photo.size > 0) {
    await uploadBoardPhoto(id, photo);
  }

  revalidatePath("/board");
  redirect(`/board/${id}`);
}

export async function updateBoardMember(memberId: string, formData: FormData): Promise<void> {
  await requireSession();

  const photo = formData.get("photo");

  await db.doc(`boardMembers/${memberId}`).update({
    name: String(formData.get("name") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    order: Number(formData.get("order") ?? 0),
  });

  if (photo instanceof File && photo.size > 0) {
    await uploadBoardPhoto(memberId, photo);
  }

  revalidatePath(`/board/${memberId}`);
  revalidatePath("/board");
}

export async function deleteBoardMember(memberId: string): Promise<void> {
  await requireSession();
  await db.doc(`boardMembers/${memberId}`).delete();
  revalidatePath("/board");
  redirect("/board");
}
