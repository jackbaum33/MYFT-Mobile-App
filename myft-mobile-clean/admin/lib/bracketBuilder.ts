import type { Timestamp } from "firebase-admin/firestore";
import type { Division, BracketDoc, BracketSlot, BracketRound } from "@/lib/types";

/**
 * Duplicated from functions/src/bracket.ts (no shared package between admin/ and
 * functions/, same convention as pickerForNumber above). Used by both the real-money
 * path (none here — admin never auto-generates) and the "Generate Mock Bracket" testing
 * tool in app/(dashboard)/brackets/actions.ts, so this must stay byte-for-byte compatible
 * with the Cloud Function's seeding math or a mock bracket won't look like the real thing.
 */

export type TeamStanding = { teamID: string; name: string; wins: number; losses: number; pointDifferential: number };

export type GeneratedGameDoc = {
  docId: string;
  round: number;
  roundLabel: string;
  division: Division;
  bracketSlot: number;
  seed1?: number;
  seed2?: number;
  team1ID?: string;
  team2ID?: string;
  status: "Scheduled" | "TBD" | "Bye";
  isBye?: boolean;
  startTime?: Timestamp;
};

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** seedOrder(8) -> [1,8,4,5,2,7,3,6] — guarantees seed1 vs seed2 can only meet in the Final. */
export function seedOrder(size: number): number[] {
  let seeds = [1];
  while (seeds.length < size) {
    const n = seeds.length * 2;
    const next: number[] = [];
    for (const s of seeds) next.push(s, n + 1 - s);
    seeds = next;
  }
  return seeds;
}

export function roundLabel(roundIndex: number, numRounds: number, size: number): string {
  const distanceFromFinal = numRounds - 1 - roundIndex;
  const slotsInRound = size / Math.pow(2, roundIndex + 1);
  if (distanceFromFinal === 0) return "Final";
  if (distanceFromFinal === 1) return "Semifinals";
  if (distanceFromFinal === 2) return "Quarterfinals";
  return `Round of ${slotsInRound * 2}`;
}

export function rankStandings(teams: TeamStanding[]): TeamStanding[] {
  return [...teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointDifferential !== a.pointDifferential) return b.pointDifferential - a.pointDifferential;
    return a.name.localeCompare(b.name);
  });
}

export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as T;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export function buildBracket(
  division: Division,
  seeds: { seed: number; teamID: string }[],
  startTime?: Timestamp
): { bracket: Omit<BracketDoc, "generatedAt" | "sourceStandings">; games: GeneratedGameDoc[] } {
  const qualifyingTeamCount = seeds.length;
  const size = nextPow2(qualifyingTeamCount);
  const numRounds = Math.log2(size);
  const order = seedOrder(size);
  const seedToTeam = new Map(seeds.map((s) => [s.seed, s.teamID]));

  const games: GeneratedGameDoc[] = [];
  const rounds: BracketRound[] = [];

  const round0Label = roundLabel(0, numRounds, size);
  const round0Slots: BracketSlot[] = [];
  const numRound0Slots = size / 2;

  for (let slotIndex = 0; slotIndex < numRound0Slots; slotIndex++) {
    const seedA = order[slotIndex * 2];
    const seedB = order[slotIndex * 2 + 1];
    const teamA = seedA <= qualifyingTeamCount ? seedToTeam.get(seedA) : undefined;
    const teamB = seedB <= qualifyingTeamCount ? seedToTeam.get(seedB) : undefined;
    const gameId = `bracket-${division}-r0-s${slotIndex}`;

    if (teamA && teamB) {
      round0Slots.push({
        slotIndex,
        seed1: seedA,
        seed2: seedB,
        team1ID: teamA,
        team2ID: teamB,
        gameId,
        isBye: false,
        winnerTeamID: null,
      });
      games.push({
        docId: gameId,
        round: 0,
        roundLabel: round0Label,
        division,
        bracketSlot: slotIndex,
        seed1: seedA,
        seed2: seedB,
        team1ID: teamA,
        team2ID: teamB,
        status: "Scheduled",
        startTime,
      });
    } else {
      const presentTeam = teamA ?? teamB;
      const presentSeed = teamA ? seedA : seedB;
      round0Slots.push({
        slotIndex,
        seed1: teamA ? seedA : undefined,
        seed2: teamB ? seedB : undefined,
        team1ID: teamA ?? null,
        team2ID: teamB ?? null,
        gameId,
        isBye: true,
        winnerTeamID: presentTeam ?? null,
      });
      games.push({
        docId: gameId,
        round: 0,
        roundLabel: round0Label,
        division,
        bracketSlot: slotIndex,
        seed1: presentSeed,
        team1ID: presentTeam,
        status: "Bye",
        isBye: true,
        startTime,
      });
    }
  }
  rounds.push({ roundIndex: 0, label: round0Label, slots: round0Slots });

  let prevRoundSlots = round0Slots;
  for (let r = 1; r < numRounds; r++) {
    const numSlots = size / Math.pow(2, r + 1);
    const label = roundLabel(r, numRounds, size);
    const slots: BracketSlot[] = [];

    for (let slotIndex = 0; slotIndex < numSlots; slotIndex++) {
      const feedA = prevRoundSlots[slotIndex * 2];
      const feedB = prevRoundSlots[slotIndex * 2 + 1];
      const gameId = `bracket-${division}-r${r}-s${slotIndex}`;

      feedA.advancesToRound = r;
      feedA.advancesToSlot = slotIndex;
      feedA.advancesToSide = "team1";
      feedB.advancesToRound = r;
      feedB.advancesToSlot = slotIndex;
      feedB.advancesToSide = "team2";

      const team1ID = feedA.isBye ? feedA.winnerTeamID ?? undefined : undefined;
      const team2ID = feedB.isBye ? feedB.winnerTeamID ?? undefined : undefined;
      const bothKnown = !!team1ID && !!team2ID;

      slots.push({
        slotIndex,
        team1ID: team1ID ?? null,
        team2ID: team2ID ?? null,
        gameId,
        isBye: false,
        winnerTeamID: null,
      });
      games.push({
        docId: gameId,
        round: r,
        roundLabel: label,
        division,
        bracketSlot: slotIndex,
        team1ID,
        team2ID,
        status: bothKnown ? "Scheduled" : "TBD",
        startTime,
      });
    }

    rounds.push({ roundIndex: r, label, slots });
    prevRoundSlots = slots;
  }

  return {
    bracket: { division, size, qualifyingTeamCount, seeds, rounds, status: "generated" },
    games,
  };
}
