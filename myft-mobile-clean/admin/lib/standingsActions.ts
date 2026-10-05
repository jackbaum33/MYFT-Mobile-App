"use server";

import { db } from "@/lib/firebaseAdmin";
import { requireSession } from "@/lib/session";
import type { TeamDoc } from "@/lib/types";
import { parseRecord } from "@/lib/utils";

export type StandingsTeam = {
  id: string;
  name: string;
  captain: string;
  division: string;
  wins: number;
  losses: number;
  pointDifferential: number;
};

/** Polled from the client (StandingsModal) to approximate live updates while it's open. */
export async function getStandings(): Promise<StandingsTeam[]> {
  await requireSession();
  const snap = await db.collection("teams").get();
  return snap.docs.map((d) => {
    const data = d.data() as TeamDoc;
    const { wins, losses } = parseRecord(data.record);
    return {
      id: d.id,
      name: data.name ?? d.id,
      captain: data.captain_name || data.captain || "",
      division: (data.division ?? "boys").toLowerCase(),
      wins,
      losses,
      pointDifferential: data.pointDifferential ?? 0,
    };
  });
}
