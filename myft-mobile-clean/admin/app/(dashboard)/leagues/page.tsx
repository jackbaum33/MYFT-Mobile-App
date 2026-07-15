import Link from "next/link";
import { db } from "@/lib/firebaseAdmin";
import type { LeagueDoc, UserProfile } from "@/lib/types";
import { pageTitle, tableWrap, table, th, td } from "@/lib/ui";

function statusColor(status: LeagueDoc["status"]): string {
  if (status === "drafting") return "text-green-400";
  if (status === "complete") return "text-text/50";
  return "text-yellow";
}

export default async function LeaguesPage() {
  const [leaguesSnap, usersSnap] = await Promise.all([
    db.collection("leagues").get(),
    db.collection("users").get(),
  ]);

  const userName = new Map<string, string>();
  usersSnap.forEach((d) => userName.set(d.id, (d.data() as UserProfile).displayName ?? d.id));

  const leagues = leaguesSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as LeagueDoc) }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));

  return (
    <div>
      <h1 className={pageTitle}>Leagues</h1>
      <p className="mb-4 text-sm text-text/70">Read-only viewer for support/debugging.</p>

      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Owner</th>
              <th className={th}>Members</th>
              <th className={th}>Status</th>
              <th className={th}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {leagues.map((l) => (
              <tr key={l.id}>
                <td className={td}>
                  <Link href={`/leagues/${l.id}`} className="font-semibold hover:text-yellow">
                    {l.name}
                  </Link>
                </td>
                <td className={td}>{userName.get(l.ownerUid) ?? l.ownerUid}</td>
                <td className={td}>{l.memberUids?.length ?? 0}</td>
                <td className={`${td} font-bold ${statusColor(l.status)}`}>{l.status}</td>
                <td className={td}>
                  {l.status === "drafting" ? `${l.currentPickNumber ?? 0}/${l.totalPicks ?? 0}` : "—"}
                </td>
              </tr>
            ))}
            {leagues.length === 0 && (
              <tr>
                <td className={td} colSpan={5}>
                  No leagues yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
