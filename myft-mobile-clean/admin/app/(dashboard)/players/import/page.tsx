"use client";

import { useActionState } from "react";
import Link from "next/link";
import { importPlayersAction, type ImportState } from "./actions";
import SubmitButton from "@/components/SubmitButton";
import { card, pageTitle, input, tableWrap, table, th, td, badge } from "@/lib/ui";

const initialState: ImportState = { step: "idle" };

export default function ImportPlayersPage() {
  const [state, formAction] = useActionState(importPlayersAction, initialState);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className={pageTitle}>Import Players from CSV</h1>

      {state.step === "idle" && state.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {state.error}
        </div>
      )}

      {state.step === "idle" && (
        <form action={formAction} encType="multipart/form-data" className={`${card} space-y-4`}>
          <p className="text-sm text-text/70">
            Upload the sign-up form CSV export. Expects a &quot;Name (First &amp; Last)&quot; column; rows
            signing up as a &quot;Fan&quot; are skipped automatically. Nothing is written until you confirm
            on the next screen — teams are still assigned by hand afterward.
          </p>
          <input type="file" name="csv" accept=".csv,text/csv" required className={input} />
          <SubmitButton pendingText="Reading…">Preview Import</SubmitButton>
        </form>
      )}

      {state.step === "previewed" && (
        <form action={formAction} className={`${card} space-y-4`}>
          <input type="hidden" name="phase" value="commit" />
          <input type="hidden" name="payload" value={JSON.stringify(state.candidates)} />
          <p className="text-sm text-text/70">
            {state.candidates.filter((c) => c.status === "new").length} new player(s) found. Uncheck any you
            don&apos;t want to import.
          </p>
          <div className={tableWrap}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}></th>
                  <th className={th}>Name</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {state.candidates.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>
                      <input
                        type="checkbox"
                        name="selected"
                        value={c.id}
                        defaultChecked={c.status === "new"}
                        disabled={c.status !== "new"}
                      />
                    </td>
                    <td className={td}>{c.name}</td>
                    <td className={td}>
                      {c.status === "new" && <span className={`${badge} bg-green-500/20 text-green-300`}>New</span>}
                      {c.status === "existing" && (
                        <span className={`${badge} bg-text/10 text-text/60`}>Already exists</span>
                      )}
                      {c.status === "fan" && (
                        <span className={`${badge} bg-text/10 text-text/60`}>Fan — skipped</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SubmitButton pendingText="Importing…">
            Import {state.candidates.filter((c) => c.status === "new").length} Players
          </SubmitButton>
        </form>
      )}

      {state.step === "done" && (
        <div className={`${card} space-y-3`}>
          <p className="text-sm text-text">
            ✅ Created {state.createdCount} player{state.createdCount === 1 ? "" : "s"}.
          </p>
          <div className="flex gap-4">
            <Link href="/players" className="text-sm font-semibold text-yellow hover:underline">
              Go to Players →
            </Link>
            <Link href="/players/import" className="text-sm font-semibold text-text/70 hover:underline">
              Import another CSV
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
