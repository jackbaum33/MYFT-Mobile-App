import { notFound } from "next/navigation";
import { db } from "@/lib/firebaseAdmin";
import type { PlayerDoc, TeamDoc } from "@/lib/types";
import { STAT_FIELDS, statsFromArray } from "@/lib/types";
import { playerImageUrl } from "@/lib/utils";
import { updatePlayer, deletePlayer } from "../actions";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import SubmitButton from "@/components/SubmitButton";
import SavedToast from "@/components/SavedToast";
import { card, input, label, select, btnDanger, pageTitle, sectionTitle } from "@/lib/ui";

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [playerSnap, teamsSnap] = await Promise.all([
    db.doc(`players/${id}`).get(),
    db.collection("teams").orderBy("name").get(),
  ]);
  if (!playerSnap.exists) notFound();
  const player = playerSnap.data() as PlayerDoc;
  const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as TeamDoc) }));
  const totals = statsFromArray(player.seasonTotals);

  const boundUpdate = updatePlayer.bind(null, id);
  const boundDelete = deletePlayer.bind(null, id);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className={pageTitle}>{player.display_name ?? id}</h1>

      <div className={`${card} flex items-center gap-4`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- external Firebase Storage URL, not worth Next/Image config */}
        <img
          src={playerImageUrl(id)}
          alt={player.display_name ?? id}
          width={64}
          height={64}
          className="h-16 w-16 rounded-full bg-navy object-cover"
        />
        <p className="text-xs text-text/60">Upload a new photo below to replace this.</p>
      </div>

      <form action={boundUpdate} encType="multipart/form-data" className={`${card} space-y-4`}>
        <h2 className={sectionTitle}>Player Info</h2>
        <div>
          <label className={label}>Name</label>
          <input type="text" name="name" defaultValue={player.display_name ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Team</label>
          <select name="teamId" defaultValue={player.team_id ?? ""} className={select}>
            <option value="">— Unassigned —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.division})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Photo</label>
          <input type="file" name="photo" accept="image/*" className={input} />
        </div>

        <h2 className={`${sectionTitle} pt-2`}>Season Totals</h2>
        <div className="grid grid-cols-2 gap-3">
          {STAT_FIELDS.map((f, idx) => (
            <div key={f.key}>
              <label className={label}>{f.label}</label>
              <input type="number" name={`season_${idx}`} defaultValue={totals[idx]} className={input} />
            </div>
          ))}
        </div>

        <SubmitButton pendingText="Saving…">Save</SubmitButton>
        <SavedToast />
      </form>

      <form action={boundDelete}>
        <ConfirmSubmitButton confirmText="Delete this player permanently?" pendingText="Deleting…" className={btnDanger}>
          Delete Player
        </ConfirmSubmitButton>
      </form>
    </div>
  );
}
