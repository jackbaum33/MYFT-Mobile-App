// context/TournamentContext.tsx
import React, { createContext, useContext, useState } from 'react';

// context/TournamentContext.tsx (only interfaces shown)
export interface Player {
  id: string;
  name: string;
  position: 'QB' | 'WR' | 'RB' | 'DB' | 'LB' | 'OL' | 'DL' | 'Util';
  division: 'boys' | 'girls';
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
  division: 'boys' | 'girls';
  captain: string;                // NEW
  record: { wins: number; losses: number }; // NEW
  players: Player[];
}


export interface FantasyRoster {
  boys: string[]; // player IDs
  girls: string[];
}

interface TournamentContextType {
  teams: Team[];
  userRoster: FantasyRoster;
  updateRoster: (division: 'boys' | 'girls', playerId: string) => void;
  calculatePoints: (player: Player) => number;
}

import { mockTeams } from '../app/data/mockData';

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teams] = useState<Team[]>(mockTeams);
  const [userRoster, setUserRoster] = useState<FantasyRoster>({ boys: [], girls: [] });

  const updateRoster = (division: 'boys' | 'girls', playerId: string) => {
    setUserRoster(prev => {
      const existing = prev[division];
      const updated = existing.includes(playerId)
        ? existing.filter(id => id !== playerId)
        : existing.length < 7
          ? [...existing, playerId]
          : existing;
      return { ...prev, [division]: updated };
    });
  };

  const calculatePoints = (player: Player) => {
    const { touchdowns, interceptions, flagsPulled, mvpAwards } = player.stats;
    return touchdowns * 6 + interceptions * 3 + flagsPulled * 1 + mvpAwards * 10;
  };

  return (
    <TournamentContext.Provider value={{ teams, userRoster, updateRoster, calculatePoints }}>
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) throw new Error('useTournament must be used within TournamentProvider');
  return context;
};
