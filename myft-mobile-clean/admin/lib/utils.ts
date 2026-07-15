export function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function playerImagePath(playerId: string): string {
  return `players/${playerId}/${playerId.replace(/-/g, "")}.jpg`;
}

export function playerImageUrl(playerId: string): string {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || "myft-2025.firebasestorage.app";
  const filename = playerId.replace(/-/g, "");
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/players%2F${playerId}%2F${filename}.jpg?alt=media`;
}

export function parseRecord(record: { wins?: number; losses?: number } | number[] | undefined): {
  wins: number;
  losses: number;
} {
  if (Array.isArray(record)) return { wins: record[0] ?? 0, losses: record[1] ?? 0 };
  if (record && typeof record === "object") return { wins: record.wins ?? 0, losses: record.losses ?? 0 };
  return { wins: 0, losses: 0 };
}

export function fmtDateTime(ts?: { toDate: () => Date }): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

/** For <input type="datetime-local"> value attributes (local time, no timezone suffix). */
export function toDateTimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Duplicated from services/leagues.ts / functions/src/leagues.ts (read-only viewer here). */
export function pickerForNumber(
  league: { draftOrder?: string[]; draftStyle?: "snake" | "linear" },
  pickNumber: number
): string | undefined {
  const order = league.draftOrder;
  if (!order || order.length === 0) return undefined;
  const n = order.length;
  const round = Math.floor(pickNumber / n);
  const idx = pickNumber % n;
  const reversed = league.draftStyle === "snake" && round % 2 === 1;
  return reversed ? order[n - 1 - idx] : order[idx];
}
