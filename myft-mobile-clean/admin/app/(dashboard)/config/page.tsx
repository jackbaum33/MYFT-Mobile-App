import { db } from "@/lib/firebaseAdmin";
import type { TournamentConfig } from "@/lib/types";
import { toDateTimeLocalValue } from "@/lib/utils";
import { updateConfig } from "./actions";
import { card, input, label, btnPrimary, pageTitle } from "@/lib/ui";

export default async function ConfigPage() {
  const snap = await db.doc("config/tournament").get();
  const config = (snap.exists ? snap.data() : {}) as TournamentConfig;
  const fantasyLockValue = config.fantasyLockAt ? toDateTimeLocalValue(config.fantasyLockAt.toDate()) : "";

  return (
    <div className="max-w-lg">
      <h1 className={pageTitle}>Tournament Config</h1>
      <p className="mb-4 text-sm text-text/70">
        Controls the playoff bracket generator (<code>generateBracketOnPoolComplete</code>). Leave a
        playoff-teams field at 0 to keep that division&apos;s bracket off.
      </p>
      <form action={updateConfig} className={`${card} space-y-4`}>
        <div>
          <label className={label}>Boys Playoff Teams</label>
          <input
            type="number"
            name="boysPlayoffTeams"
            min={0}
            defaultValue={config.boysPlayoffTeams ?? 0}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Girls Playoff Teams</label>
          <input
            type="number"
            name="girlsPlayoffTeams"
            min={0}
            defaultValue={config.girlsPlayoffTeams ?? 0}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Saturday Date</label>
          <input type="date" name="saturdayDate" defaultValue={config.saturdayDate ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Fantasy Lock Date/Time</label>
          <input type="datetime-local" name="fantasyLockAt" defaultValue={fantasyLockValue} className={input} />
          <p className="mt-1 text-xs text-text/60">
            Once this passes, everyone&apos;s fantasy team locks and can no longer be edited. Leave blank to keep
            fantasy teams unlocked.
          </p>
        </div>
        <div>
          <label className={label}>Minimum App Version</label>
          <input
            type="text"
            name="minAppVersion"
            placeholder="e.g. 2.0.1"
            defaultValue={config.minAppVersion ?? ""}
            className={input}
          />
          <p className="mt-1 text-xs text-text/60">
            Must match the <code>version</code> in app.json for a new release. Anyone below this version sees a
            blocking &ldquo;Update Required&rdquo; screen on launch. Leave blank to disable the check.
          </p>
        </div>
        <div>
          <label className={label}>Update URL</label>
          <input
            type="text"
            name="updateUrl"
            placeholder="https://apps.apple.com/app/..."
            defaultValue={config.updateUrl ?? ""}
            className={input}
          />
          <p className="mt-1 text-xs text-text/60">Opened when the user taps &ldquo;Update Now&rdquo;.</p>
        </div>
        <button className={btnPrimary}>Save</button>
      </form>
    </div>
  );
}
