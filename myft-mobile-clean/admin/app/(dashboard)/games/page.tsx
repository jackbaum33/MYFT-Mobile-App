import Link from "next/link";
import { db } from "@/lib/firebaseAdmin";
import type { GameDoc, TeamDoc } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";
import { pageTitle, btnPrimary, btnSecondary, tableWrap, table, th, td, input, select, label } from "@/lib/ui";

function statusColor(status?: string): string {
  const s = (status ?? "").toLowerCase();
  if (s === "live") return "text-green-400";
  if (s === "final") return "text-text/50";
  return "text-yellow";
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ division?: string; status?: string; team?: string; q?: string; date?: string }>;
}) {
  const { division, status, team, q, date } = await searchParams;

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
  const teams = teamsSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as TeamDoc) }))
    .sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));
  const boysTeams = teams.filter((t) => (t.division ?? "").toLowerCase() === "boys");
  const girlsTeams = teams.filter((t) => (t.division ?? "").toLowerCase() === "girls");

  let games = gamesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as GameDoc) }));

  if (division) {
    games = games.filter((g) => teamDivision.get(g.team1ID ?? "") === division);
  }
  if (status) {
    games = games.filter((g) => (g.status ?? "").toLowerCase() === status.toLowerCase());
  }
  if (team) {
    games = games.filter((g) => g.team1ID === team || g.team2ID === team);
  }
  if (q?.trim()) {
    const needle = q.trim().toLowerCase();
    games = games.filter((g) => {
      const n1 = (teamName.get(g.team1ID ?? "") ?? g.team1ID ?? "").toLowerCase();
      const n2 = (teamName.get(g.team2ID ?? "") ?? g.team2ID ?? "").toLowerCase();
      const round = (g.roundLabel ?? "").toLowerCase();
      const field = (g.field ?? "").toLowerCase();
      return n1.includes(needle) || n2.includes(needle) || round.includes(needle) || field.includes(needle);
    });
  }
  if (date) {
    games = games.filter((g) => {
      const t = g.startTime?.toDate();
      if (!t) return false;
      const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
      return key === date;
    });
  }

  games.sort((a, b) => (a.startTime?.toMillis() ?? 0) - (b.startTime?.toMillis() ?? 0));

  const filterLink = (params: Record<string, string | undefined>) => {
    const merged = { division, status, team, q, date, ...params };
    const qs = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return qs ? `/games?${qs}` : "/games";
  };

  const hasSearchFilters = Boolean(team || q || date);

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

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        {division && <input type="hidden" name="division" value={division} />}
        {status && <input type="hidden" name="status" value={status} />}
        <div>
          <label className={label}>Team</label>
          <select name="team" defaultValue={team ?? ""} className={`${select} min-w-[10rem]`}>
            <option value="">All teams</option>
            <optgroup label="Boys">
              {boysTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Girls">
              {girlsTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label className={label}>Search</label>
          <input type="text" name="q" defaultValue={q ?? ""} placeholder="Team, round, field…" className={`${input} min-w-[12rem]`} />
        </div>
        <div>
          <label className={label}>Date</label>
          <input type="date" name="date" defaultValue={date ?? ""} className={input} />
        </div>
        <button className={btnSecondary}>Apply</button>
        {hasSearchFilters && (
          <Link href={filterLink({ team: undefined, q: undefined, date: undefined })} className="text-sm text-text/60 hover:text-yellow">
            Clear
          </Link>
        )}
      </form>

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
