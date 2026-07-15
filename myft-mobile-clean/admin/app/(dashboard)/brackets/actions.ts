"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import { requireSession } from "@/lib/session";
import type { BracketDoc } from "@/lib/types";

/** Manual correction: overrides a bracket slot's teams and mirrors it onto the matching games doc. */
export async function overrideSlot(
  division: string,
  roundIndex: number,
  slotIndex: number,
  formData: FormData
): Promise<void> {
  await requireSession();

  const team1ID = String(formData.get("team1ID") ?? "").trim();
  const team2ID = String(formData.get("team2ID") ?? "").trim();

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

  if (gameId) {
    const bothKnown = !!team1ID && !!team2ID;
    await db.doc(`games/${gameId}`).update({
      team1ID: team1ID || FieldValue.delete(),
      team2ID: team2ID || FieldValue.delete(),
      status: bothKnown ? "Scheduled" : "TBD",
    });
  }

  revalidatePath("/brackets");
  revalidatePath("/games");
}
