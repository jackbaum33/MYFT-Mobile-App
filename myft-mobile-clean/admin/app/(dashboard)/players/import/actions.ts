"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebaseAdmin";
import { requireSession } from "@/lib/session";
import { slugify } from "@/lib/utils";
import { parseCsv } from "@/lib/csv";
import type { PlayerDoc } from "@/lib/types";

export type ImportCandidate = { id: string; name: string; status: "new" | "existing" | "fan" };

export type ImportState =
  | { step: "idle"; error?: string }
  | { step: "previewed"; candidates: ImportCandidate[] }
  | { step: "done"; createdCount: number };

function normalize(s: string): string {
  return slugify(s).replace(/-/g, "");
}

export async function importPlayersAction(_prevState: ImportState, formData: FormData): Promise<ImportState> {
  await requireSession();

  if (formData.get("phase") === "commit") {
    let candidates: ImportCandidate[] = [];
    try {
      candidates = JSON.parse(String(formData.get("payload") ?? "[]"));
    } catch {
      return { step: "idle", error: "Lost the preview data — please upload the CSV again." };
    }
    const selectedIds = new Set(formData.getAll("selected").map(String));
    const toCreate = candidates.filter((c) => c.status === "new" && selectedIds.has(c.id));

    if (toCreate.length > 0) {
      const batch = db.batch();
      for (const c of toCreate) {
        batch.set(db.doc(`players/${c.id}`), {
          display_name: c.name,
          seasonTotals: Array(11).fill(0),
        });
      }
      await batch.commit();
      revalidatePath("/players");
    }

    return { step: "done", createdCount: toCreate.length };
  }

  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) {
    return { step: "idle", error: "Choose a CSV file to upload." };
  }

  const text = (await file.text()).replace(/^﻿/, "");
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { step: "idle", error: "That CSV doesn't have any data rows." };
  }

  const header = rows[0];
  const dataRows = rows.slice(1).filter((r) => r.some((c) => c.trim() !== ""));

  const nameIdx = header.findIndex((h) => h.trim() === "Name (First & Last)");
  if (nameIdx < 0) {
    return { step: "idle", error: 'Couldn\'t find a "Name (First & Last)" column in that CSV.' };
  }
  const signupIdxs = header
    .map((h, i) => (h.trim().startsWith("I am signing up as") ? i : -1))
    .filter((i) => i >= 0);
  const pick = (row: string[], idxs: number[]) => idxs.map((i) => (row[i] ?? "").trim()).find((v) => v);

  const existingSnap = await db.collection("players").get();
  const existingNames = new Set<string>();
  existingSnap.forEach((d) => {
    const p = d.data() as PlayerDoc;
    existingNames.add(normalize(p.display_name ?? d.id));
  });

  const seen = new Set<string>();
  const candidates: ImportCandidate[] = [];
  for (const row of dataRows) {
    const name = (row[nameIdx] ?? "").trim();
    if (!name) continue;
    const norm = normalize(name);
    if (seen.has(norm)) continue;
    seen.add(norm);

    const signup = pick(row, signupIdxs);
    let status: ImportCandidate["status"] = "new";
    if (signup === "Fan") status = "fan";
    else if (existingNames.has(norm)) status = "existing";

    candidates.push({ id: slugify(name), name, status });
  }

  return { step: "previewed", candidates };
}
