import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebaseAdmin";
import type { PlayerDoc, TeamDoc } from "@/lib/types";
import { parseRecord, teamLogoUrl } from "@/lib/utils";
import {
  updateTeamMeta,
  recomputeTeamRecord,
  addPlayerToTeam,
  removePlayerFromTeam,
  deleteTeam,
} from "../actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import SubmitButton from "@/components/SubmitButton";
import SavedToast from "@/components/SavedToast";
import {
  card,
  input,
  label,
  btnPrimary,
  btnDanger,
  pageTitle,
  sectionTitle,
  tableWrap,
  table,
  th,
  td,
  select,
} from "@/lib/ui";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const teamSnap = await db.doc(`teams/${id}`).get();
  if (!teamSnap.exists) notFound();
  const team = teamSnap.data() as TeamDoc;

  const playersSnap = await db.collection("players").get();
  const allPlayers = playersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as PlayerDoc) }));
  const roster = allPlayers
    .filter((p) => p.team_id === id)
    .sort((a, b) => (a.display_name ?? a.id).localeCompare(b.display_name ?? b.id));
  const others = allPlayers
    .filter((p) => p.team_id !== id)
    .sort((a, b) => (a.display_name ?? a.id).localeCompare(b.display_name ?? b.id));

  const { wins, losses } = parseRecord(team.record);

  const boundUpdateMeta = updateTeamMeta.bind(null, id);
  const boundRecompute = recomputeTeamRecord.bind(null, id);
  const boundAddPlayer = addPlayerToTeam.bind(null, id);
  const boundDeleteTeam = deleteTeam.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className={pageTitle}>{team.name}</h1>

      <form action={boundUpdateMeta} encType="multipart/form-data" className={`${card} space-y-4`}>
        <h2 className={sectionTitle}>Team Info</h2>
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- external Firebase Storage URL */}
          <img
            src={teamLogoUrl(id)}
            alt={team.name ?? id}
            width={56}
            height={56}
            className="h-14 w-14 rounded-lg bg-navy object-contain"
          />
          <div className="flex-1">
            <label className={label}>Logo</label>
            <input type="file" name="logo" accept="image/*" className={input} />
          </div>
        </div>
        <div>
          <label className={label}>Name</label>
          <input type="text" name="name" defaultValue={team.name ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Captain</label>
          <input type="text" name="captain" defaultValue={team.captain_name ?? team.captain ?? ""} className={input} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={label}>Wins</label>
            <input type="number" name="wins" defaultValue={wins} className={input} />
          </div>
          <div>
            <label className={label}>Losses</label>
            <input type="number" name="losses" defaultValue={losses} className={input} />
          </div>
          <div>
            <label className={label}>Point Diff</label>
            <input type="number" name="pointDifferential" defaultValue={team.pointDifferential ?? 0} className={input} />
          </div>
        </div>
        <div className="flex gap-2">
          <SubmitButton pendingText="Saving…">Save</SubmitButton>
        </div>
        <SavedToast />
      </form>

      <form action={boundRecompute} className={`${card} flex items-center justify-between`}>
        <p className="text-sm text-text/80">
          Recompute wins/losses/point differential from this team&apos;s Final pool games.
        </p>
        <SubmitButton variant="secondary" pendingText="Recomputing…">Recompute from Games</SubmitButton>
        <SavedToast message="Recomputed" />
      </form>

      <div className={`${card} space-y-4`}>
        <div className="flex items-center justify-between">
          <h2 className={sectionTitle}>Roster ({roster.length})</h2>
          <Link href={`/players/new?teamId=${id}`} className={btnPrimary}>
            + New Player
          </Link>
        </div>

        <div className={tableWrap}>
          <table className={table}>
            <thead>
              <tr>
                <th className={th}>Player</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {roster.map((p) => {
                const boundRemove = removePlayerFromTeam.bind(null, id, p.id);
                return (
                  <tr key={p.id}>
                    <td className={td}>
                      <Link href={`/players/${p.id}`} className="hover:text-yellow">
                        {p.display_name ?? p.id}
                      </Link>
                    </td>
                    <td className={td}>
                      <form action={boundRemove}>
                        <SubmitButton variant="danger" small pendingText="Removing…">
                          Remove
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {roster.length === 0 && (
                <tr>
                  <td className={td} colSpan={2}>
                    No players on this team yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form action={boundAddPlayer} className="flex items-end gap-2">
          <div className="flex-1">
            <label className={label}>Add existing player</label>
            <select name="playerId" className={select} defaultValue="">
              <option value="" disabled>
                Select a player…
              </option>
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name ?? p.id} {p.team_id ? `(currently: ${p.team_id})` : ""}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton variant="secondary" pendingText="Adding…">Add</SubmitButton>
        </form>
      </div>

      <form action={boundDeleteTeam}>
        <ConfirmSubmitButton
          confirmText="Delete this team? Players keep their current team_id and will need reassigning."
          pendingText="Deleting…"
          className={btnDanger}
        >
          Delete Team
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
