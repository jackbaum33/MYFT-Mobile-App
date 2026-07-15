import Link from "next/link";
import { db } from "@/lib/firebaseAdmin";
import type { GameDoc, TeamDoc } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";
import { pageTitle, btnPrimary, tableWrap, table, th, td } from "@/lib/ui";

function statusColor(status?: string): string {
  const s = (status ?? "").toLowerCase();
  if (s === "live") return "text-green-400";
  if (s === "final") return "text-text/50";
  return "text-yellow";
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ division?: string; status?: string }>;
}) {
  const { division, status } = await searchParams;

  const [gamesSnap, teamsSnap] = await Promise.all([
    db.collection("games").get(),
    db.collection("teams").get(),
  ]);

  const teamName = new Map<string, string>();
  const teamDivision = new Map<string, string>();
  teamsSnap.forEach((d) => {
    const data = d.data() as TeamDoc;
    teamName.set(d.id, data.name ?? d.id);
    teamDivision.set(d.id, (data.division ?? "").toLowerCase());
  });

  let games = gamesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as GameDoc) }));

  if (division) {
    games = games.filter((g) => teamDivision.get(g.team1ID ?? "") === division);
  }
  if (status) {
    games = games.filter((g) => (g.status ?? "").toLowerCase() === status.toLowerCase());
  }

  games.sort((a, b) => (a.startTime?.toMillis() ?? 0) - (b.startTime?.toMillis() ?? 0));

  const filterLink = (params: Record<string, string | undefined>) => {
    const merged = { division, status, ...params };
    const qs = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return qs ? `/games?${qs}` : "/games";
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageTitle}>Games</h1>
        <Link href="/games/new" className={btnPrimary}>
          + New Game
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <div className="flex gap-2">
          <Link href={filterLink({ division: undefined })} className={!division ? "font-bold text-yellow" : "text-text/70"}>
            All
          </Link>
          <Link href={filterLink({ division: "boys" })} className={division === "boys" ? "font-bold text-yellow" : "text-text/70"}>
            Boys
          </Link>
          <Link href={filterLink({ division: "girls" })} className={division === "girls" ? "font-bold text-yellow" : "text-text/70"}>
            Girls
          </Link>
        </div>
        <div className="flex gap-2 border-l border-line pl-4">
          {["", "Scheduled", "Live", "Final", "TBD", "Bye"].map((s) => (
            <Link
              key={s || "all"}
              href={filterLink({ status: s || undefined })}
              className={(status ?? "") === s ? "font-bold text-yellow" : "text-text/70"}
            >
              {s || "All"}
            </Link>
          ))}
        </div>
      </div>

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>Matchup</th>
              <th className={th}>Round</th>
              <th className={th}>Status</th>
              <th className={th}>Score</th>
              <th className={th}>Start</th>
              <th className={th}>Field</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.id}>
                <td className={td}>
                  <Link href={`/games/${g.id}`} className="font-semibold hover:text-yellow">
                    {teamName.get(g.team1ID ?? "") ?? g.team1ID ?? "TBD"} vs{" "}
                    {teamName.get(g.team2ID ?? "") ?? g.team2ID ?? "TBD"}
                  </Link>
                </td>
                <td className={td}>{g.roundLabel ?? "—"}</td>
                <td className={`${td} font-bold ${statusColor(g.status)}`}>{g.status ?? "—"}</td>
                <td className={td}>
                  {g.team1score ?? 0}–{g.team2score ?? 0}
                </td>
                <td className={td}>{fmtDateTime(g.startTime)}</td>
                <td className={td}>{g.field ?? "—"}</td>
              </tr>
            ))}
            {games.length === 0 && (
              <tr>
                <td className={td} colSpan={6}>
                  No games match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
