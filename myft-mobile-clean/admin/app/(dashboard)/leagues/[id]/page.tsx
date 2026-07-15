import { notFound } from "next/navigation";
import { db } from "@/lib/firebaseAdmin";
import type { DraftPickDoc, LeagueDoc, LeagueRosterDoc, PlayerDoc, UserProfile } from "@/lib/types";
import { pickerForNumber } from "@/lib/utils";
import { card, pageTitle, sectionTitle, tableWrap, table, th, td } from "@/lib/ui";

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const leagueSnap = await db.doc(`leagues/${id}`).get();
  if (!leagueSnap.exists) notFound();
  const league = leagueSnap.data() as LeagueDoc;

  const [usersSnap, rostersSnap, picksSnap, playersSnap] = await Promise.all([
    db.collection("users").get(),
    db.collection(`leagues/${id}/rosters`).get(),
    db.collection(`leagues/${id}/picks`).orderBy("pickNumber").get(),
    db.collection("players").get(),
  ]);

  const userName = new Map<string, string>();
  usersSnap.forEach((d) => userName.set(d.id, (d.data() as UserProfile).displayName ?? d.id));

  const playerName = new Map<string, string>();
  playersSnap.forEach((d) => playerName.set(d.id, (d.data() as PlayerDoc).display_name ?? d.id));

  const rosters = rostersSnap.docs.map((d) => d.data() as LeagueRosterDoc);
  const picks = picksSnap.docs.map((d) => d.data() as DraftPickDoc);

  const onTheClock =
    league.status === "drafting" ? pickerForNumber(league, league.currentPickNumber ?? 0) : undefined;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className={pageTitle}>{league.name}</h1>

      <div className={`${card} space-y-2`}>
        <h2 className={sectionTitle}>Settings</h2>
        <p className="text-sm text-text/90">
          {league.boysPerTeam} boys / {league.girlsPerTeam} girls per team •{" "}
          {league.draftStyle === "snake" ? "Snake" : "Normal"} draft
        </p>
        <p className="text-sm text-text/90">Status: {league.status}</p>
        <p className="text-sm text-text/90">
          Scheduled start: {league.scheduledStart?.toDate().toLocaleString() ?? "—"}
        </p>
        {league.status === "drafting" && (
          <p className="text-sm font-bold text-yellow">
            On the clock: {onTheClock ? userName.get(onTheClock) ?? onTheClock : "—"} (pick{" "}
            {(league.currentPickNumber ?? 0) + 1} of {league.totalPicks ?? 0})
          </p>
        )}
        <p className="text-sm text-text/90">
          Members: {league.memberUids.map((uid) => userName.get(uid) ?? uid).join(", ")}
        </p>
      </div>

      <div className={card}>
        <h2 className={sectionTitle}>Rosters</h2>
        <div className="space-y-3">
          {rosters.map((r) => (
            <div key={r.uid}>
              <p className="text-sm font-semibold text-text">{userName.get(r.uid) ?? r.uid}</p>
              <p className="text-xs text-text/70">
                Boys: {r.boys?.map((pid) => playerName.get(pid) ?? pid).join(", ") || "—"}
              </p>
              <p className="text-xs text-text/70">
                Girls: {r.girls?.map((pid) => playerName.get(pid) ?? pid).join(", ") || "—"}
              </p>
            </div>
          ))}
          {rosters.length === 0 && <p className="text-sm text-text/70">Draft hasn&apos;t started.</p>}
        </div>
      </div>

      <div>
        <h2 className={sectionTitle}>Pick Feed</h2>
        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>#</th>
                <th className={th}>Round</th>
                <th className={th}>Member</th>
                <th className={th}>Player</th>
                <th className={th}>Division</th>
              </tr>
            </thead>
            <tbody>
              {picks.map((p) => (
                <tr key={p.pickNumber}>
                  <td className={td}>{p.pickNumber + 1}</td>
                  <td className={td}>{p.round + 1}</td>
                  <td className={td}>{userName.get(p.uid) ?? p.uid}</td>
                  <td className={td}>{playerName.get(p.playerId) ?? p.playerId}</td>
                  <td className={td}>{p.division}</td>
                </tr>
              ))}
              {picks.length === 0 && (
                <tr>
                  <td className={td} colSpan={5}>
                    No picks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
