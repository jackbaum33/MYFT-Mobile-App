// context/TournamentContext.tsx
import React, { createContext, useContext, useMemo, useState } from 'react';
import { mockTeams } from '../app/data/mockData';
import {
  scheduleData,
  statsForRender,
  type PlayerGameStat,
} from '../app/data/scheduleData';

/** ---------- Types ---------- **/
export type Division = 'boys' | 'girls';

export type PlayerStats = {
  touchdowns: number;
  passingTDs: number;
  shortReceptions: number;
  mediumReceptions: number;
  longReceptions: number;
  catches: number;
  flagsPulled: number;
  sacks: number;
  interceptions: number;
  passingInterceptions: number;
};

export interface Player {
  id: string;
  name: string;
  division: Division;
  teamId: string;
  stats: PlayerStats; // <-- now filled by aggregating scheduleData
}

export interface Team {
  id: string;
  name: string;
  division: Division;
  captain: string;
  record: { wins: number; losses: number };
  players: Player[];
}

export interface FantasyRoster {
  boys: string[];
  girls: string[];
}

type TournamentContextType = {
  teams: Team[];
  userRoster: FantasyRoster;
  updateRoster: (division: Division, playerId: string) => void; // toggle add/remove
  calculatePoints: (p: Player) => number;
};

/** ---------- Scoring Table ---------- **/
const SCORING = {
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
} as const;

/** ---------- Helpers ---------- **/
const EMPTY: PlayerStats = {
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
};

const normDiv = (v: unknown): Division => {
  const s = String(v ?? '').toLowerCase();
  if (s.startsWith('girl') || s === 'women' || s === 'female' || s === 'girls') return 'girls';
  return 'boys';
};

/** Sum a single game line into a totals object */
const addLine = (totals: PlayerStats, line: PlayerGameStat) => {
  totals.touchdowns            += line.touchdowns            ?? 0;
  totals.passingTDs            += line.passingTDs            ?? 0;
  totals.shortReceptions       += line.shortReceptions       ?? 0;
  totals.mediumReceptions      += line.mediumReceptions      ?? 0;
  totals.longReceptions        += line.longReceptions        ?? 0;
  totals.catches               += line.catches               ?? 0;
  totals.flagsPulled           += line.flagsPulled           ?? 0;
  totals.sacks                 += line.sacks                 ?? 0;
  totals.interceptions         += line.interceptions         ?? 0;
  totals.passingInterceptions  += line.passingInterceptions  ?? 0;
};

/** Build a map of playerId -> aggregated PlayerStats from scheduleData (Live + Final only) */
const buildStatsFromSchedule = (): Map<string, PlayerStats> => {
  const map = new Map<string, PlayerStats>();

  for (const day of scheduleData) {
    for (const g of day.games) {
      const box = statsForRender(g); // Live => liveStats, Final => finalBoxScore, Scheduled => undefined
      if (!box) continue;

      const allLines: PlayerGameStat[] = [...(box.team1 ?? []), ...(box.team2 ?? [])];
      for (const line of allLines) {
        const cur = map.get(line.playerId) ?? { ...EMPTY };
        addLine(cur, line);
        map.set(line.playerId, cur);
      }
    }
  }
  return map;
};

/** ---------- Context ---------- **/
const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

/** ---------- Provider ---------- **/
export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  /**
   * Build teams from mockTeams for structure (ids, names, rosters),
   * but replace each player's stats with the aggregation from scheduleData.
   */
  const [teams] = useState<Team[]>(() => {
    const totalsByPlayer = buildStatsFromSchedule();

    return mockTeams.map((t: any) => ({
      ...t,
      division: normDiv(t.division),
      players: (t.players ?? []).map((p: any) => ({
        ...p,
        division: normDiv(p.division),
        // use aggregated stats (or zeros if the player has no lines yet)
        stats: totalsByPlayer.get(p.id) ?? { ...EMPTY },
      })),
    }));
  });

  const [userRoster, setUserRoster] = useState<FantasyRoster>({ boys: [], girls: [] });

  /** Toggle add/remove a player from a division list (safe, no undefined.includes) */
  const updateRoster = (division: Division, playerId: string) => {
    setUserRoster((prev) => {
      const list = prev[division] ?? [];
      const exists = list.includes(playerId);
      const nextList = exists ? list.filter((id) => id !== playerId) : [...list, playerId];
      return { ...prev, [division]: nextList };
    });
  };

  /** New fantasy scoring */
  const calculatePoints = (p: Player) => {
    const s = p.stats;
    return (
      s.touchdowns * SCORING.touchdown +
      s.passingTDs * SCORING.passingTD +
      s.shortReceptions * SCORING.shortReception +
      s.mediumReceptions * SCORING.mediumReception +
      s.longReceptions * SCORING.longReception +
      s.catches * SCORING.catch +
      s.flagsPulled * SCORING.flagGrab +
      s.sacks * SCORING.sack +
      s.interceptions * SCORING.interception +
      s.passingInterceptions * SCORING.passingInterception
    );
  };

  const value = useMemo(
    () => ({ teams, userRoster, updateRoster, calculatePoints }),
    [teams, userRoster]
  );

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
};

/** ---------- Hook ---------- **/
export const useTournament = () => {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournament must be used within a TournamentProvider');
  return ctx;
};
