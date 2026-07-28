import Link from "next/link";
import { db } from "@/lib/firebaseAdmin";
import type { PlayerDoc, TeamDoc } from "@/lib/types";
import { pageTitle, btnPrimary, btnSecondary, tableWrap, table, th, td, input } from "@/lib/ui";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const [playersSnap, teamsSnap] = await Promise.all([
    db.collection("players").get(),
    db.collection("teams").get(),
  ]);

  const teamName = new Map<string, string>();
  teamsSnap.forEach((d) => teamName.set(d.id, (d.data() as TeamDoc).name ?? d.id));

  let players = playersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as PlayerDoc) }));

  if (q?.trim()) {
    const needle = q.trim().toLowerCase();
    players = players.filter(
      (p) =>
        (p.display_name ?? p.id).toLowerCase().includes(needle) ||
        (teamName.get(p.team_id ?? "") ?? "").toLowerCase().includes(needle)
    );
  }

  players.sort((a, b) => (a.display_name ?? a.id).localeCompare(b.display_name ?? b.id));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageTitle}>Players</h1>
        <div className="flex gap-2">
          <Link href="/players/import" className={btnSecondary}>
            Import CSV
          </Link>
          <Link href="/players/new" className={btnPrimary}>
            + New Player
          </Link>
        </div>
      </div>

      <form className="mb-4 flex gap-2" method="get">
        <input type="text" name="q" defaultValue={q ?? ""} placeholder="Search by name or team…" className={`${input} max-w-sm`} />
        <button className={btnSecondary}>Search</button>
      </form>

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>Player</th>
              <th className={th}>Team</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td className={td}>
                  <Link href={`/players/${p.id}`} className="font-semibold hover:text-yellow">
                    {p.display_name ?? p.id}
                  </Link>
                </td>
                <td className={td}>{p.team_id ? teamName.get(p.team_id) ?? p.team_id : "— unassigned —"}</td>
              </tr>
            ))}
            {players.length === 0 && (
              <tr>
                <td className={td} colSpan={2}>
                  No players found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
