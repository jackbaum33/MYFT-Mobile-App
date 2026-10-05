import Link from "next/link";
import { db } from "@/lib/firebaseAdmin";
import type { BracketDoc, TeamDoc, TournamentConfig } from "@/lib/types";
import { overrideSlot, generateBracket, deleteBracket } from "./actions";
import { teamOptionLabel } from "@/lib/utils";
import SubmitButton from "@/components/SubmitButton";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import SavedToast from "@/components/SavedToast";
import { card, input, label, select, btnDanger, btnSmall, pageTitle, sectionTitle } from "@/lib/ui";

export default async function BracketsPage({
  searchParams,
}: {
  searchParams: Promise<{ division?: string }>;
}) {
  const { division: divisionParam } = await searchParams;
  const division = divisionParam === "girls" ? "girls" : "boys";

  const [bracketSnap, teamsSnap, configSnap] = await Promise.all([
    db.doc(`brackets/${division}`).get(),
    db.collection("teams").where("division", "==", division).get(),
    db.doc("config/tournament").get(),
  ]);

  const teams = teamsSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as TeamDoc) }))
    .sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));
  const teamName = new Map(teams.map((t) => [t.id, t.name ?? t.id]));
  const config = configSnap.data() as TournamentConfig | undefined;
  const saturdayDate = config?.saturdayDate;
  const defaultCount = division === "boys" ? config?.boysPlayoffTeams : config?.girlsPlayoffTeams;

  return (
    <div className="max-w-3xl">
      <h1 className={pageTitle}>Brackets</h1>

      <div className="mb-6 flex gap-4 text-sm">
        <Link href="/brackets?division=boys" className={division === "boys" ? "font-bold text-yellow" : "text-text/70"}>
          Boys
        </Link>
        <Link href="/brackets?division=girls" className={division === "girls" ? "font-bold text-yellow" : "text-text/70"}>
          Girls
        </Link>
      </div>

      {!bracketSnap.exists ? (
        <div className="space-y-4">
          <p className="text-sm text-text/70">
            No bracket generated yet for {division}.
          </p>

          <form action={generateBracket.bind(null, division)} className={`${card} space-y-3`}>
            <h2 className={sectionTitle}>Generate Bracket</h2>
            <p className="text-xs text-text/60">
              Seeds {division} teams by their current record and point differential (same tiebreak as everywhere
              else: wins, then point diff, then name) and builds the full bracket plus every round&apos;s game. Do
              this once pool play is done — or earlier, to preview how it&apos;ll look; delete it below to redo it
              if standings change.
            </p>
            {saturdayDate ? (
              <p className="text-xs text-text/60">
                Dated for <span className="font-semibold text-text">{saturdayDate}</span> (the Saturday Date set on{" "}
                <Link href="/config" className="underline hover:text-yellow">
                  Config
                </Link>
                ) — that&apos;s the day it&apos;ll show up as its own tab on the app&apos;s Schedule screen.
              </p>
            ) : (
              <p className="text-xs text-yellow">
                No Saturday Date is set on{" "}
                <Link href="/config" className="underline">
                  Config
                </Link>
                — without one, these games get no date at all and won&apos;t appear anywhere in the app&apos;s
                Schedule tab. Set it first.
              </p>
            )}
            <div className="max-w-xs">
              <label className={label}>Teams to include</label>
              <input
                type="number"
                name="count"
                min={2}
                defaultValue={defaultCount || undefined}
                placeholder="All teams"
                className={input}
              />
              {!!defaultCount && (
                <p className="mt-1 text-xs text-text/50">
                  Defaulted from the playoff team count set on{" "}
                  <Link href="/config" className="underline hover:text-yellow">
                    Config
                  </Link>
                  .
                </p>
              )}
            </div>
            <SubmitButton pendingText="Generating…">Generate Bracket</SubmitButton>
          </form>
        </div>
      ) : (
        (() => {
          const bracket = bracketSnap.data() as BracketDoc;
          return (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3">
                <p className="text-sm text-text/70">
                  Status: <span className="font-semibold text-text">{bracket.status}</span> •{" "}
                  {bracket.qualifyingTeamCount} teams
                </p>
                <form action={deleteBracket.bind(null, division)}>
                  <ConfirmSubmitButton
                    confirmText={`Delete the ${division} bracket and its games? This can't be undone.`}
                    pendingText="Deleting…"
                    className={`${btnDanger} ${btnSmall}`}
                  >
                    Delete Bracket
                  </ConfirmSubmitButton>
                </form>
              </div>
              {bracket.rounds.map((round) => (
                <div key={round.roundIndex} className={card}>
                  <h2 className={sectionTitle}>{round.label}</h2>
                  <div className="space-y-3">
                    {round.slots.map((slot) => {
                      const boundOverride = overrideSlot.bind(null, division, round.roundIndex, slot.slotIndex);
                      return (
                        <div key={slot.slotIndex} className="rounded-lg border border-line p-3">
                          <p className="mb-2 text-sm text-text/80">
                            Slot {slot.slotIndex}
                            {slot.isBye && <span className="ml-2 font-bold text-yellow">BYE</span>}
                            {slot.winnerTeamID && (
                              <span className="ml-2 font-bold text-green-400">
                                Winner: {teamName.get(slot.winnerTeamID) ?? slot.winnerTeamID}
                              </span>
                            )}
                          </p>
                          <form action={boundOverride} className="flex flex-wrap items-end gap-2">
                            <div>
                              <label className="mb-1 block text-xs text-text/60">
                                Team 1 {slot.seed1 ? `(seed ${slot.seed1})` : ""}
                              </label>
                              <select name="team1ID" defaultValue={slot.team1ID ?? ""} className={select}>
                                <option value="">— TBD —</option>
                                {teams.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {teamOptionLabel(t)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-text/60">
                                Team 2 {slot.seed2 ? `(seed ${slot.seed2})` : ""}
                              </label>
                              <select name="team2ID" defaultValue={slot.team2ID ?? ""} className={select}>
                                <option value="">— TBD —</option>
                                {teams.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {teamOptionLabel(t)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <SubmitButton variant="secondary" pendingText="Saving…">Override</SubmitButton>
                            <SavedToast message="Slot updated" />
                          </form>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      )}
    </div>
  );
}
