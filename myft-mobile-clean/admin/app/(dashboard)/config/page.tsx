import { db } from "@/lib/firebaseAdmin";
import type { TournamentConfig } from "@/lib/types";
import { updateConfig } from "./actions";
import { card, input, label, btnPrimary, pageTitle } from "@/lib/ui";

export default async function ConfigPage() {
  const snap = await db.doc("config/tournament").get();
  const config = (snap.exists ? snap.data() : {}) as TournamentConfig;

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
        <button className={btnPrimary}>Save</button>
      </form>
    </div>
  );
}
