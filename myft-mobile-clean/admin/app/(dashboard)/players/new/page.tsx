import { db } from "@/lib/firebaseAdmin";
import type { TeamDoc } from "@/lib/types";
import { createPlayer } from "../actions";
import NameIdFields from "@/components/NameIdFields";
import { card, input, label, select, btnPrimary, btnSecondary, pageTitle } from "@/lib/ui";

export default async function NewPlayerPage({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string; created?: string }>;
}) {
  const { teamId, created } = await searchParams;

  const teamsSnap = await db.collection("teams").orderBy("name").get();
  const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as TeamDoc) }));
  const boys = teams.filter((t) => (t.division ?? "").toLowerCase() === "boys");
  const girls = teams.filter((t) => (t.division ?? "").toLowerCase() === "girls");

  return (
    <div className="max-w-lg">
      <h1 className={pageTitle}>New Player</h1>

      {created && (
        <p className="mb-4 rounded-lg bg-green-500/20 px-3 py-2 text-sm font-semibold text-green-300">
          Created &ldquo;{created}&rdquo;. Add the next one below.
        </p>
      )}

      <form action={createPlayer} encType="multipart/form-data" className={`${card} space-y-4`}>
        <NameIdFields />

        <div>
          <label className={label}>Team</label>
          <select name="teamId" className={select} defaultValue={teamId ?? ""}>
            <option value="">— Unassigned —</option>
            <optgroup label="Boys">
              {boys.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Girls">
              {girls.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className={label}>Photo</label>
          <input type="file" name="photo" accept="image/*" className={input} />
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" name="intent" value="save" className={btnPrimary}>
            Save
          </button>
          <button type="submit" name="intent" value="saveAndAddAnother" className={btnSecondary}>
            Save &amp; Add Another
          </button>
        </div>
      </form>
    </div>
  );
}
