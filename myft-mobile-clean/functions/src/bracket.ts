import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

const db = () => admin.firestore();

// --- Types ---

export type Division = 'boys' | 'girls';

export type TournamentConfig = {
  boysPlayoffTeams?: number;
  girlsPlayoffTeams?: number;
  saturdayDate?: string; // 'YYYY-MM-DD'
};

export type BracketSlot = {
  slotIndex: number;
  seed1?: number;
  seed2?: number;
  team1ID?: string | null;
  team2ID?: string | null;
  gameId: string;
  isBye: boolean;
  winnerTeamID?: string | null;
  advancesToRound?: number;
  advancesToSlot?: number;
  advancesToSide?: 'team1' | 'team2';
};

export type BracketRound = {
  roundIndex: number;
  label: string;
  slots: BracketSlot[];
};

export type BracketDoc = {
  division: Division;
  size: number;
  qualifyingTeamCount: number;
  seeds: { seed: number; teamID: string }[];
  rounds: BracketRound[];
  status: 'generated' | 'complete';
  generatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  sourceStandings: { teamID: string; wins: number; losses: number; pointDifferential: number; seed: number }[];
};

type RawTeamDoc = {
  name?: string;
  division?: string;
  record?: number[] | { wins?: number; losses?: number };
  pointDifferential?: number;
};

type TeamStanding = {
  teamID: string;
  name: string;
  wins: number;
  losses: number;
  pointDifferential: number;
};

type GeneratedGameDoc = {
  docId: string;
  round: number;
  roundLabel: string;
  division: Division;
  bracketSlot: number;
  seed1?: number;
  seed2?: number;
  team1ID?: string;
  team2ID?: string;
  status: 'Scheduled' | 'TBD' | 'Bye';
  isBye?: boolean;
  startTime?: FirebaseFirestore.Timestamp;
};

// --- Helpers duplicated from context/TournamentContext.tsx (functions/ has no shared package with app/) ---

function normDiv(v: unknown): Division {
  const s = String(v ?? '').toLowerCase();
  if (s.includes('girl') || s.includes('women') || s.includes('female')) return 'girls';
  return 'boys';
}

function parseRecord(record: RawTeamDoc['record']): { wins: number; losses: number } {
  if (Array.isArray(record)) return { wins: record[0] ?? 0, losses: record[1] ?? 0 };
  if (record && typeof record === 'object') return { wins: record.wins ?? 0, losses: record.losses ?? 0 };
  return { wins: 0, losses: 0 };
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as T;
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

// --- Seeding math ---

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Standard recursive bracket seed order: guarantees seed1 vs seed2 can only
 * meet in the Final, and byes always land on the best-remaining seeds.
 * seedOrder(8) -> [1,8,4,5,2,7,3,6]
 */
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
  if (distanceFromFinal === 0) return 'Final';
  if (distanceFromFinal === 1) return 'Semifinals';
  if (distanceFromFinal === 2) return 'Quarterfinals';
  return `Round of ${slotsInRound * 2}`;
}

function rankStandings(teams: TeamStanding[]): TeamStanding[] {
  return [...teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointDifferential !== a.pointDifferential) return b.pointDifferential - a.pointDifferential;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Builds the full bracket structure (all rounds) plus the flat list of `games`
 * docs to create. Byes are resolved immediately: a round-0 bye writes its
 * survivor directly into the round-1 slot it feeds, no game doc is created for
 * the bye slot's opponent, and the winner is recorded on the bye slot itself.
 */
export function buildBracket(
  division: Division,
  seeds: { seed: number; teamID: string }[],
  startTime?: FirebaseFirestore.Timestamp
): { bracket: Omit<BracketDoc, 'generatedAt' | 'sourceStandings'>; games: GeneratedGameDoc[] } {
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
        status: 'Scheduled',
        startTime,
      });
    } else {
      // At most one side can be missing here: size = nextPow2(qualifyingTeamCount)
      // guarantees qualifyingTeamCount > size / 2 (except the trivial 1-team case).
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
        status: 'Bye',
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
      feedA.advancesToSide = 'team1';
      feedB.advancesToRound = r;
      feedB.advancesToSlot = slotIndex;
      feedB.advancesToSide = 'team2';

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
        status: bothKnown ? 'Scheduled' : 'TBD',
        startTime,
      });
    }

    rounds.push({ roundIndex: r, label, slots });
    prevRoundSlots = slots;
  }

  return {
    bracket: { division, size, qualifyingTeamCount, seeds, rounds, status: 'generated' },
    games,
  };
}

// --- Cloud Functions ---

/**
 * Fires on every pool-play game (no `round` field) reaching Final. Once ALL of
 * a division's pool games are Final, ranks standings from `teams.record` /
 * `teams.pointDifferential` (both admin-maintained — see plan), seeds the top
 * `config/tournament.{division}PlayoffTeams` teams into a bracket, and writes
 * `brackets/{division}` plus every round's `games` docs in one transaction.
 * No-ops (feature off) if that config value is unset for the division.
 */
export const generateBracketOnPoolComplete = onDocumentUpdated('games/{gameId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  if (after.round !== undefined) return; // only pool games trigger generation

  const beforeFinal = String(before.status ?? '').toLowerCase() === 'final';
  const afterFinal = String(after.status ?? '').toLowerCase() === 'final';
  if (beforeFinal || !afterFinal) return; // only the -> Final transition

  const team1ID = String(after.team1ID ?? '');
  if (!team1ID) return;

  const teamSnap = await db().doc(`teams/${team1ID}`).get();
  if (!teamSnap.exists) return;
  const division = normDiv((teamSnap.data() as RawTeamDoc | undefined)?.division ?? team1ID);

  const bracketRef = db().doc(`brackets/${division}`);
  if ((await bracketRef.get()).exists) return; // already generated

  const configSnap = await db().doc('config/tournament').get();
  const config = (configSnap.data() ?? {}) as TournamentConfig;
  const qualifyingCount = division === 'boys' ? config.boysPlayoffTeams : config.girlsPlayoffTeams;
  if (!qualifyingCount || qualifyingCount < 2) return; // feature off for this division

  const [teamsSnap, gamesSnap] = await Promise.all([db().collection('teams').get(), db().collection('games').get()]);

  const divisionTeams: TeamStanding[] = [];
  const teamIdsInDivision = new Set<string>();
  teamsSnap.forEach((d) => {
    const data = d.data() as RawTeamDoc;
    if (normDiv(data?.division ?? d.id) !== division) return;
    teamIdsInDivision.add(d.id);
    const { wins, losses } = parseRecord(data.record);
    divisionTeams.push({
      teamID: d.id,
      name: data.name ?? d.id,
      wins,
      losses,
      pointDifferential: data.pointDifferential ?? 0,
    });
  });
  if (divisionTeams.length === 0) return;

  let allPoolFinal = true;
  gamesSnap.forEach((d) => {
    const g = d.data();
    if (g.round !== undefined) return; // skip bracket games
    const t1 = String(g.team1ID ?? '');
    const t2 = String(g.team2ID ?? '');
    if (!teamIdsInDivision.has(t1) && !teamIdsInDivision.has(t2)) return; // other division
    if (String(g.status ?? '').toLowerCase() !== 'final') allPoolFinal = false;
  });
  if (!allPoolFinal) return;

  const ranked = rankStandings(divisionTeams);
  const qualifiers = ranked.slice(0, qualifyingCount);
  if (qualifiers.length < 2) return;

  const seeds = qualifiers.map((t, i) => ({ seed: i + 1, teamID: t.teamID }));

  let startTime: FirebaseFirestore.Timestamp | undefined;
  if (config.saturdayDate) {
    const d = new Date(`${config.saturdayDate}T00:00:00`);
    if (!isNaN(d.getTime())) startTime = admin.firestore.Timestamp.fromDate(d);
  }

  const { bracket, games } = buildBracket(division, seeds, startTime);

  await db().runTransaction(async (tx) => {
    const recheck = await tx.get(bracketRef);
    if (recheck.exists) return; // race guard

    tx.set(
      bracketRef,
      stripUndefined({
        ...bracket,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        sourceStandings: ranked.map((t, i) => ({
          teamID: t.teamID,
          wins: t.wins,
          losses: t.losses,
          pointDifferential: t.pointDifferential,
          seed: i + 1,
        })),
      })
    );

    for (const g of games) {
      const { docId, ...rest } = g;
      tx.set(db().doc(`games/${docId}`), stripUndefined(rest));
    }
  });

  console.log(
    `[generateBracketOnPoolComplete] generated ${division} bracket: ${qualifiers.length} teams, ${games.length} games`
  );
});

/**
 * Fires when a bracket game (has a `round` field, not a bye) reaches Final.
 * Determines the winner by score, records it on the `brackets/{division}` slot,
 * and — unless this was the Final — writes the winner into the next round's
 * `games` doc, flipping its status from TBD to Scheduled once both teams are
 * known. A single Firestore transaction keeps the bracket doc and the
 * destination game doc consistent, and is idempotent (re-firing on the same
 * transition is a no-op once the winner is already recorded).
 */
export const advanceBracketOnGameFinal = onDocumentUpdated('games/{gameId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  if (after.round === undefined || after.isBye === true) return; // only real bracket games

  const beforeFinal = String(before.status ?? '').toLowerCase() === 'final';
  const afterFinal = String(after.status ?? '').toLowerCase() === 'final';
  if (beforeFinal || !afterFinal) return;

  const division = after.division as Division | undefined;
  const round = after.round as number | undefined;
  const bracketSlot = after.bracketSlot as number | undefined;
  if (!division || round === undefined || bracketSlot === undefined) return;

  const score1 = Number(after.team1score ?? 0);
  const score2 = Number(after.team2score ?? 0);
  if (score1 === score2) {
    console.error(
      `[advanceBracketOnGameFinal] tie score on ${division} round ${round} slot ${bracketSlot} (${event.params.gameId}) — refusing to advance, fix the score manually`
    );
    return;
  }
  const winnerTeamID = score1 > score2 ? String(after.team1ID ?? '') : String(after.team2ID ?? '');
  if (!winnerTeamID) return;

  const bracketRef = db().doc(`brackets/${division}`);

  await db().runTransaction(async (tx) => {
    const bracketSnap = await tx.get(bracketRef);
    if (!bracketSnap.exists) return;
    const bracket = bracketSnap.data() as BracketDoc;

    const roundData = bracket.rounds.find((r) => r.roundIndex === round);
    const slot = roundData?.slots.find((s) => s.slotIndex === bracketSlot);
    if (!roundData || !slot) return;
    if (slot.winnerTeamID === winnerTeamID) return; // idempotent no-op

    const hasNextRound = slot.advancesToRound !== undefined;
    const destRef = hasNextRound
      ? db().doc(`games/bracket-${division}-r${slot.advancesToRound}-s${slot.advancesToSlot}`)
      : undefined;
    const destSnap = destRef ? await tx.get(destRef) : undefined;

    const newRounds = bracket.rounds.map((r) => {
      if (r.roundIndex === round) {
        return {
          ...r,
          slots: r.slots.map((s) => (s.slotIndex === bracketSlot ? { ...s, winnerTeamID } : s)),
        };
      }
      if (hasNextRound && r.roundIndex === slot.advancesToRound) {
        return {
          ...r,
          slots: r.slots.map((s) =>
            s.slotIndex === slot.advancesToSlot
              ? { ...s, [slot.advancesToSide === 'team1' ? 'team1ID' : 'team2ID']: winnerTeamID }
              : s
          ),
        };
      }
      return r;
    });

    if (!destRef) {
      tx.update(bracketRef, { rounds: newRounds, status: 'complete' });
      console.log(`[advanceBracketOnGameFinal] ${division} bracket complete — champion ${winnerTeamID}`);
      return;
    }

    tx.update(bracketRef, { rounds: newRounds });

    if (destSnap && destSnap.exists) {
      const destData = destSnap.data() as Record<string, unknown>;
      const sideField = slot.advancesToSide === 'team1' ? 'team1ID' : 'team2ID';
      const otherField = slot.advancesToSide === 'team1' ? 'team2ID' : 'team1ID';
      const bothKnown = !!destData[otherField];
      tx.update(destRef, { [sideField]: winnerTeamID, status: bothKnown ? 'Scheduled' : 'TBD' });
    }
  });
});
