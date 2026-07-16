"use server";

import { revalidatePath } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { requireSession } from "@/lib/session";

export async function updateConfig(formData: FormData): Promise<void> {
  await requireSession();

  const boysPlayoffTeams = Number(formData.get("boysPlayoffTeams") ?? 0);
  const girlsPlayoffTeams = Number(formData.get("girlsPlayoffTeams") ?? 0);
  const saturdayDate = String(formData.get("saturdayDate") ?? "").trim();
  const fantasyLockAtRaw = String(formData.get("fantasyLockAt") ?? "").trim();
  const minAppVersion = String(formData.get("minAppVersion") ?? "").trim();
  const updateUrl = String(formData.get("updateUrl") ?? "").trim();

  await db.doc("config/tournament").set(
    {
      boysPlayoffTeams: boysPlayoffTeams > 0 ? boysPlayoffTeams : FieldValue.delete(),
      girlsPlayoffTeams: girlsPlayoffTeams > 0 ? girlsPlayoffTeams : FieldValue.delete(),
      saturdayDate: saturdayDate || FieldValue.delete(),
      fantasyLockAt: fantasyLockAtRaw ? Timestamp.fromDate(new Date(fantasyLockAtRaw)) : FieldValue.delete(),
      minAppVersion: minAppVersion || FieldValue.delete(),
      updateUrl: updateUrl || FieldValue.delete(),
    },
    { merge: true }
  );

  revalidatePath("/config");
}
