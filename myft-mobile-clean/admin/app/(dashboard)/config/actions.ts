"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { requireSession } from "@/lib/session";

export async function updateConfig(formData: FormData): Promise<void> {
  await requireSession();

  const boysPlayoffTeams = Number(formData.get("boysPlayoffTeams") ?? 0);
  const girlsPlayoffTeams = Number(formData.get("girlsPlayoffTeams") ?? 0);
  const saturdayDate = String(formData.get("saturdayDate") ?? "").trim();

  await db.doc("config/tournament").set(
    {
      boysPlayoffTeams: boysPlayoffTeams > 0 ? boysPlayoffTeams : FieldValue.delete(),
      girlsPlayoffTeams: girlsPlayoffTeams > 0 ? girlsPlayoffTeams : FieldValue.delete(),
      saturdayDate: saturdayDate || FieldValue.delete(),
    },
    { merge: true }
  );

  revalidatePath("/config");
}
