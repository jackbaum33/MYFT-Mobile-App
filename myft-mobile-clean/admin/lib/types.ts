import type { Timestamp } from "firebase-admin/firestore";

// Duplicated from context/TournamentContext.tsx, functions/src/bracket.ts, and
// services/leagues.ts in the Expo app — no shared package between the two projects.

export type Division = "boys" | "girls";

export type PlayerStats = {
  touchdowns: number;
  passingTDs: number;
  minimalReceptions: number;
  shortReceptions: number;
  mediumReceptions: number;
  longReceptions: number;
  catches: number;
  flagsPulled: number;
  sacks: number;
  interceptions: number;
  passingInterceptions: number;
};

export const STAT_FIELDS: { key: keyof PlayerStats; label: string }[] = [
  { key: "touchdowns", label: "TD" },
  { key: "passingTDs", label: "Pass TD" },
  { key: "minimalReceptions", label: "Min Rec" },
  { key: "shortReceptions", label: "Short Rec" },
  { key: "mediumReceptions", label: "Med Rec" },
  { key: "longReceptions", label: "Long Rec" },
  { key: "catches", label: "Catch" },
  { key: "flagsPulled", label: "Flag" },
  { key: "sacks", label: "Sack" },
  { key: "interceptions", label: "INT" },
  { key: "passingInterceptions", label: "Pass INT" },
];

export function statsFromArray(arr?: number[]): number[] {
  const a = Array.isArray(arr) ? arr : [];
  return Array.from({ length: 11 }, (_, i) => a[i] ?? 0);
}

export type TeamDoc = {
  name?: string;
  division?: string;
  captain_name?: string;
  captain?: string;
  record?: { wins?: number; losses?: number } | number[];
  pointDifferential?: number;
  abbreviation?: string;
  color?: string;
};

export type PlayerDoc = {
  display_name?: string;
  team_id?: string;
  seasonTotals?: number[];
};

export type GameDoc = {
  team1ID?: string;
  team2ID?: string;
  team1score?: number;
  team2score?: number;
  status?: string;
  startTime?: Timestamp;
  field?: string;
  playerStats?: Record<string, number[]>;
  round?: number;
  roundLabel?: string;
  division?: Division;
  bracketSlot?: number;
  seed1?: number;
  seed2?: number;
  isBye?: boolean;
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
  advancesToSide?: "team1" | "team2";
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
  status: "generated" | "complete";
  generatedAt?: Timestamp;
  sourceStandings: {
    teamID: string;
    wins: number;
    losses: number;
    pointDifferential: number;
    seed: number;
  }[];
};

export type TournamentConfig = {
  boysPlayoffTeams?: number;
  girlsPlayoffTeams?: number;
  saturdayDate?: string;
  fantasyLockAt?: Timestamp;
  minAppVersion?: string;
  updateUrl?: string;
};

export type ScheduleDoc = {
  title?: string;
  location?: string;
  address?: string;
  startAt?: Timestamp;
  reminderSentAt?: Timestamp;
};

export type BoardMemberDoc = {
  name?: string;
  title?: string;
  email?: string;
  order?: number;
};

export type UserProfile = {
  uid: string;
  displayName: string;
  username: string;
  photoUrl?: string;
};

export type DraftStyle = "snake" | "linear";
export type LeagueStatus = "pending" | "drafting" | "complete";

export type LeagueDoc = {
  name: string;
  ownerUid: string;
  memberUids: string[];
  boysPerTeam: number;
  girlsPerTeam: number;
  draftStyle: DraftStyle;
  scheduledStart: Timestamp;
  status: LeagueStatus;
  draftOrder?: string[];
  currentPickNumber?: number;
  totalPicks?: number;
  draftedPlayerIds?: string[];
  createdAt: Timestamp;
};

export type LeagueRosterDoc = { uid: string; boys: string[]; girls: string[] };

export type DraftPickDoc = {
  pickNumber: number;
  round: number;
  uid: string;
  playerId: string;
  division: Division;
  timestamp: Timestamp;
};
