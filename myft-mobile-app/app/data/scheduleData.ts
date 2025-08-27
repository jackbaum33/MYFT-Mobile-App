// app/data/scheduleData.ts
export type Gender = 'men' | 'women';
export type GameStatus = 'Scheduled' | 'Live' | 'Final';

export type TeamId = 'michigan' | 'maryland' | 'yeshiva' | 'binghamton';

/** New per-player, per-game line with all fantasy categories */
export type PlayerGameStat = {
  playerId: string;

  // Scoring buckets
  touchdowns: number;           // non-passing TDs
  passingTDs: number;           // thrown TDs
  shortReceptions: number;      // short yardage receptions
  mediumReceptions: number;     // medium yardage receptions
  longReceptions: number;       // long yardage receptions
  catches: number;              // receptions (base 1 pt / catch)
  flagsPulled: number;          // flag grabs
  sacks: number;                // defensive sacks
  interceptions: number;        // defensive INTs made
  passingInterceptions: number; // interceptions thrown (negative)
};

export type PerSide = {
  team1: PlayerGameStat[];
  team2: PlayerGameStat[];
};

export type Game = {
  id: string;
  gender: Gender;
  team1: TeamId;
  team2: TeamId;
  time: string;
  field: string;
  status: GameStatus;

  // Always present (can be empty arrays)
  liveStats: PerSide;
  finalBoxScore: PerSide;
};

export type DaySchedule = {
  label: string;  // e.g., 'APR 4'
  date: string;   // ISO
  games: Game[];
};

const emptyLine = (playerId: string): PlayerGameStat => ({
  playerId,
  touchdowns: 0,
  passingTDs: 0,
  shortReceptions: 0,
  mediumReceptions: 0,
  longReceptions: 0,
  catches: 0,
  flagsPulled: 0,
  sacks: 0,
  interceptions: 0,
  passingInterceptions: 0,
});

const emptyPerSide = (): PerSide => ({ team1: [], team2: [] });

let gid = 1;
const g = () => `g${gid++}`;

/** Seed with some games using the new fields */
export const scheduleData: DaySchedule[] = [
  {
    label: 'NOV 7',
    date: '2025-04-04',
    games: [
      {
        id: g(),
        gender: 'men',
        team1: 'michigan',
        team2: 'maryland',
        time: '09:00 AM',
        field: 'Field A',
        status: 'Live',
        liveStats: {
          team1: [
            { ...emptyLine('p1'), touchdowns: 2, passingTDs: 1, catches: 3, shortReceptions: 1, flagsPulled: 1 },
            { ...emptyLine('p2'), catches: 4, mediumReceptions: 2, touchdowns: 1 },
          ],
          team2: [
            { ...emptyLine('p3'), touchdowns: 1, interceptions: 1, sacks: 1, catches: 2 },
            { ...emptyLine('p4'), flagsPulled: 3, interceptions: 0, sacks: 1, catches: 1 },
          ],
        },
        finalBoxScore: emptyPerSide(),
      },
      {
        id: g(),
        gender: 'women',
        team1: 'yeshiva',
        team2: 'binghamton',
        time: '09:45 AM',
        field: 'Field B',
        status: 'Final',
        liveStats: emptyPerSide(),
        finalBoxScore: {
          team1: [
            { ...emptyLine('p5'), touchdowns: 2, catches: 5, longReceptions: 1, flagsPulled: 1 },
            { ...emptyLine('p6'), touchdowns: 1, catches: 3, mediumReceptions: 1 },
          ],
          team2: [
            { ...emptyLine('p7'), touchdowns: 2, catches: 4, shortReceptions: 2 },
            { ...emptyLine('p8'), interceptions: 1, catches: 1, passingInterceptions: 0 },
          ],
        },
      },
      {
        id: g(), gender: 'men', team1: 'maryland', team2: 'michigan',
        time: '10:30 AM', field: 'Field A', status: 'Scheduled',
        liveStats: emptyPerSide(), finalBoxScore: emptyPerSide(),
      },
      {
        id: g(), gender: 'women', team1: 'binghamton', team2: 'yeshiva',
        time: '11:15 AM', field: 'Field B', status: 'Scheduled',
        liveStats: emptyPerSide(), finalBoxScore: emptyPerSide(),
      },
    ],
  },
  {
    label: 'NOV 8',
    date: '2025-04-05',
    games: [
      { id: g(), gender: 'men',   team1: 'maryland',   team2: 'michigan',   time: '09:00 AM', field: 'Field A', status: 'Scheduled', liveStats: emptyPerSide(), finalBoxScore: emptyPerSide() },
      { id: g(), gender: 'women', team1: 'binghamton', team2: 'yeshiva',    time: '09:45 AM', field: 'Field B', status: 'Scheduled', liveStats: emptyPerSide(), finalBoxScore: emptyPerSide() },
      { id: g(), gender: 'men',   team1: 'michigan',   team2: 'maryland',   time: '10:30 AM', field: 'Field C', status: 'Scheduled', liveStats: emptyPerSide(), finalBoxScore: emptyPerSide() },
      { id: g(), gender: 'women', team1: 'yeshiva',    team2: 'binghamton', time: '11:15 AM', field: 'Field A', status: 'Scheduled', liveStats: emptyPerSide(), finalBoxScore: emptyPerSide() },
    ],
  },
];

/** ========= Helpers ========= */

export const statsForRender = (g: Game): PerSide | undefined =>
  g.status === 'Final' ? g.finalBoxScore
  : g.status === 'Live' ? g.liveStats
  : undefined;

/** Scoring table */
export const SCORING = {
  touchdown: 6,
  passingTD: 4,
  shortReception: 1,
  mediumReception: 2,
  longReception: 4,
  catch: 1,
  flagGrab: 1,
  sack: 3,
  interception: 4,
  passingInterception: -2,
};

/** Calculate fantasy points for a single line */
export function pointsForLine(line: PlayerGameStat): number {
  return (
    line.touchdowns * SCORING.touchdown +
    line.passingTDs * SCORING.passingTD +
    line.shortReceptions * SCORING.shortReception +
    line.mediumReceptions * SCORING.mediumReception +
    line.longReceptions * SCORING.longReception +
    line.catches * SCORING.catch +
    line.flagsPulled * SCORING.flagGrab +
    line.sacks * SCORING.sack +
    line.interceptions * SCORING.interception +
    line.passingInterceptions * SCORING.passingInterception
  );
}

/** Find a game by id */
export const findGameById = (id?: string) => {
  if (!id) return null;
  for (const day of scheduleData) {
    const game = day.games.find(g => g.id === id);
    if (game) return { day, game };
  }
  return null;
};

/** Update helpers (in-memory mocks) */

export function setGameStatus(gameId: string, next: GameStatus) {
  for (const day of scheduleData) {
    const g = day.games.find(x => x.id === gameId);
    if (!g) continue;

    if (next === 'Final') {
      g.finalBoxScore = {
        team1: [...g.liveStats.team1],
        team2: [...g.liveStats.team2],
      };
    }
    g.status = next;
    return g;
  }
  return null;
}

export const derivedPoints = (g: Game, side: 'team1' | 'team2'): string => {
  const box = statsForRender(g);
  if (!box) return '-';
  const arr = side === 'team1' ? box.team1 : box.team2;
  const totalTDs = (arr ?? []).reduce((sum, line) => sum + (line.touchdowns ?? 0), 0);
  return String(totalTDs * 7);
};

export function applyLiveStat(
  gameId: string,
  team: 'team1'|'team2',
  playerId: string,
  patch: Partial<PlayerGameStat>
) {
  for (const day of scheduleData) {
    const g = day.games.find(x => x.id === gameId);
    if (!g) continue;

    const bucket = team === 'team1' ? g.liveStats.team1 : g.liveStats.team2;
    let line = bucket.find(l => l.playerId === playerId);
    if (!line) {
      line = emptyLine(playerId);
      bucket.push(line);
    }

    // Apply only provided fields
    for (const k of Object.keys(patch) as (keyof PlayerGameStat)[]) {
      (line as any)[k] = (patch as any)[k];
    }
    return line;
  }
  return null;
}
