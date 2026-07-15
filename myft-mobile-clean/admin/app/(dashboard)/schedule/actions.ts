"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { requireSession } from "@/lib/session";

function fieldsFromForm(formData: FormData): Record<string, unknown> {
  const startAtRaw = String(formData.get("startAt") ?? "");
  return {
    title: String(formData.get("title") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    ...(startAtRaw ? { startAt: Timestamp.fromDate(new Date(startAtRaw)) } : {}),
  };
}

export async function createEvent(formData: FormData): Promise<void> {
  await requireSession();
  const data = fieldsFromForm(formData);
  if (!data.title) throw new Error("Title is required");
  await db.collection("schedule").add(data);
  revalidatePath("/schedule");
  redirect("/schedule");
}

export async function updateEvent(id: string, formData: FormData): Promise<void> {
  await requireSession();
  const data = fieldsFromForm(formData);
  await db.doc(`schedule/${id}`).update(data);
  revalidatePath("/schedule");
  redirect("/schedule");
}

export async function deleteEvent(id: string): Promise<void> {
  await requireSession();
  await db.doc(`schedule/${id}`).delete();
  revalidatePath("/schedule");
  redirect("/schedule");
}
