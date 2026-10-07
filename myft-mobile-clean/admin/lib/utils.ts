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

/**
 * `version` busts the browser/CDN cache after a re-upload — the underlying GCS object is
 * served with a 1-year Cache-Control, and the URL is otherwise identical across uploads.
 */
export function playerImageUrl(playerId: string, version?: number): string {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || "myft-2025.firebasestorage.app";
  const filename = playerId.replace(/-/g, "");
  const base = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/players%2F${playerId}%2F${filename}.jpg?alt=media`;
  return version ? `${base}&v=${version}` : base;
}

export function teamLogoPath(teamId: string): string {
  return `teams/${teamId}/logo.png`;
}

/**
 * `version` busts the browser/CDN cache after a re-upload — the underlying GCS object is
 * served with a 1-year Cache-Control, and the URL is otherwise identical across uploads.
 */
export function teamLogoUrl(teamId: string, version?: number): string {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || "myft-2025.firebasestorage.app";
  const base = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/teams%2F${teamId}%2Flogo.png?alt=media`;
  return version ? `${base}&v=${version}` : base;
}

export function boardImagePath(memberId: string): string {
  return `board/${memberId}/${memberId.replace(/-/g, "")}.jpg`;
}

export function boardImageUrl(memberId: string): string {
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || "myft-2025.firebasestorage.app";
  const filename = memberId.replace(/-/g, "");
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/board%2F${memberId}%2F${filename}.jpg?alt=media`;
}

/** Team `<option>` label used by every team dropdown in the admin panel. */
export function teamOptionLabel(
  t: { name?: string; division?: string; captain_name?: string; captain?: string },
  opts?: { showDivision?: boolean }
): string {
  const base = opts?.showDivision && t.division ? `${t.name ?? ""} (${t.division})` : t.name ?? "";
  const captain = t.captain_name || t.captain;
  return captain ? `${base} — Capt. ${captain}` : base;
}

export function parseRecord(
  record: { wins?: number; losses?: number; ties?: number } | number[] | undefined
): {
  wins: number;
  losses: number;
  ties: number;
} {
  if (Array.isArray(record)) return { wins: record[0] ?? 0, losses: record[1] ?? 0, ties: record[2] ?? 0 };
  if (record && typeof record === "object") {
    return { wins: record.wins ?? 0, losses: record.losses ?? 0, ties: record.ties ?? 0 };
  }
  return { wins: 0, losses: 0, ties: 0 };
}

/**
 * The tournament's own local timezone — used to interpret/display every
 * <input type="datetime-local"> value in the admin panel. Deliberately NOT the
 * server's ambient timezone: Vercel Functions run in UTC, so without pinning
 * this explicitly, a time typed as "7:30 AM" gets stored (or displayed) as
 * 7:30 AM UTC, which renders 4-5 hours early once read back in Eastern time.
 */
export const APP_TIME_ZONE = "America/New_York";

export function fmtDateTime(ts?: { toDate: () => Date }): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: APP_TIME_ZONE });
}

/** For <input type="datetime-local"> value attributes — formats `d` as wall-clock time in APP_TIME_ZONE. */
export function toDateTimeLocalValue(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Converts a wall-clock datetime string from an <input type="datetime-local">
 * (e.g. "2026-09-29T07:30", with NO timezone info) into the UTC instant that
 * represents in APP_TIME_ZONE — e.g. 7:30 AM becomes 11:30 UTC during EDT,
 * 12:30 UTC during EST. Handles the DST switch automatically.
 *
 * Works without a timezone library: `asUTC` is a first guess treating the typed
 * fields as if they were already UTC, then we ask Intl what wall-clock time that
 * instant shows in APP_TIME_ZONE — the gap between the guess and that answer is
 * the zone's real UTC offset at this moment, which we subtract to correct it.
 */
export function parseDateTimeLocal(raw: string): Date {
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return new Date(raw);
  const [, yy, mo, dd, hh, mi, ss] = m;
  const asUTC = Date.UTC(Number(yy), Number(mo) - 1, Number(dd), Number(hh), Number(mi), Number(ss ?? "0"));

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(asUTC));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const shown = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));

  return new Date(asUTC - (shown - asUTC));
}

/** For <input type="time"> defaultValue — just the wall-clock time-of-day portion, in APP_TIME_ZONE. */
export function formatTimeOnly(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
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
