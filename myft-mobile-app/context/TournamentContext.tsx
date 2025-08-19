// context/TournamentContext.tsx
import React, { createContext, useContext, useMemo, useState } from 'react';
import { mockTeams } from '../app/data/mockData'; // adjust path if yours differs

/** ---------- Types ---------- **/
export type Division = 'boys' | 'girls';

export interface Player {
  id: string;
  name: string;
  division: Division;
  position: string;
  teamId: string;
  stats: {
    touchdowns: number;
    interceptions: number;
    flagsPulled: number;
    mvpAwards: number;
  };
}

export interface Team {
  id: string;
  name: string;
  division: Division;
  captain: string;
  record: { wins: number; losses: number }; // <-- added to match your data
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

/** ---------- Context ---------- **/
const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

/** Normalize any incoming division strings (defensive) */
const normDiv = (v: unknown): Division => {
  const s = String(v ?? '').toLowerCase();
  if (s.startsWith('girl')) return 'girls';
  return 'boys';
};

/** ---------- Provider ---------- **/
export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Normalize mock data to satisfy strict typing
  const [teams] = useState<Team[]>(
    () =>
      mockTeams.map((t) => ({
        ...t,
        division: normDiv(t.division),
        players: t.players.map((p) => ({ ...p, division: normDiv(p.division) })),
      }))
  );

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

  /** Simple fantasy scoring (adjust to your rules) */
  const calculatePoints = (p: Player) =>
    p.stats.touchdowns * 6 + p.stats.interceptions * -2 + p.stats.flagsPulled * 1 + p.stats.mvpAwards * 5;

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
