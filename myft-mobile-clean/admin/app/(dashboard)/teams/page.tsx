import Link from "next/link";
import { db } from "@/lib/firebaseAdmin";
import type { TeamDoc } from "@/lib/types";
import { parseRecord, teamLogoUrl } from "@/lib/utils";
import { pageTitle, btnPrimary, tableWrap, table, th, td, sectionTitle } from "@/lib/ui";

export default async function TeamsPage() {
  const snap = await db.collection("teams").orderBy("name").get();
  const teams = snap.docs.map((d) => ({ id: d.id, ...(d.data() as TeamDoc) }));

  const boys = teams.filter((t) => (t.division ?? "").toLowerCase() === "boys");
  const girls = teams.filter((t) => (t.division ?? "").toLowerCase() === "girls");

  const renderTable = (list: typeof teams) => (
    <div className={tableWrap}>
      <table className={table}>
        <thead>
          <tr>
            <th className={th}></th>
            <th className={th}>Team</th>
            <th className={th}>Captain</th>
            <th className={th}>Record</th>
            <th className={th}>Point Diff</th>
          </tr>
        </thead>
        <tbody>
          {list.map((t) => {
            const { wins, losses } = parseRecord(t.record);
            return (
              <tr key={t.id}>
                <td className={td}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- external Firebase Storage URL */}
                  <img
                    src={teamLogoUrl(t.id)}
                    alt={t.name ?? t.id}
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded bg-navy object-contain"
                  />
                </td>
                <td className={td}>
                  <Link href={`/teams/${t.id}`} className="font-semibold hover:text-yellow">
                    {t.name}
                  </Link>
                </td>
                <td className={td}>{t.captain_name || t.captain || "—"}</td>
                <td className={td}>
                  {wins}-{losses}
                </td>
                <td className={td}>{t.pointDifferential ?? 0}</td>
              </tr>
            );
          })}
          {list.length === 0 && (
            <tr>
              <td className={td} colSpan={5}>
                No teams yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageTitle}>Teams</h1>
        <Link href="/teams/new" className={btnPrimary}>
          + New Team
        </Link>
      </div>

      <h2 className={sectionTitle}>Boys</h2>
      <div className="mb-6">{renderTable(boys)}</div>

      <h2 className={sectionTitle}>Girls</h2>
      {renderTable(girls)}
    </div>
  );
}
