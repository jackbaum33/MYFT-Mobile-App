import Link from "next/link";
import { db } from "@/lib/firebaseAdmin";
import type { BracketDoc, TeamDoc } from "@/lib/types";
import { overrideSlot } from "./actions";
import SubmitButton from "@/components/SubmitButton";
import SavedToast from "@/components/SavedToast";
import { card, select, pageTitle, sectionTitle } from "@/lib/ui";

export default async function BracketsPage({
  searchParams,
}: {
  searchParams: Promise<{ division?: string }>;
}) {
  const { division: divisionParam } = await searchParams;
  const division = divisionParam === "girls" ? "girls" : "boys";

  const [bracketSnap, teamsSnap] = await Promise.all([
    db.doc(`brackets/${division}`).get(),
    db.collection("teams").where("division", "==", division).get(),
  ]);

  const teams = teamsSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as TeamDoc) }))
    .sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));
  const teamName = new Map(teams.map((t) => [t.id, t.name ?? t.id]));

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
        <p className="text-sm text-text/70">
          No bracket generated yet for {division}. It&apos;s auto-created once every pool game in this
          division is Final and{" "}
          <Link href="/config" className="underline hover:text-yellow">
            playoff team count
          </Link>{" "}
          is set.
        </p>
      ) : (
        (() => {
          const bracket = bracketSnap.data() as BracketDoc;
          return (
            <div className="space-y-6">
              <p className="text-sm text-text/70">
                Status: <span className="font-semibold text-text">{bracket.status}</span> • {bracket.qualifyingTeamCount}{" "}
                teams
              </p>
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
                                    {t.name}
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
                                    {t.name}
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
