// context/TournamentContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

/** ---------- Types ---------- **/
export type Division = 'boys' | 'girls';

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

export interface Player {
  id: string;
  name: string;
  division: Division;
  teamId: string;
  stats: PlayerStats;
}

export interface Team {
  id: string;
  name: string;
  division: Division;
  captain: string; // <-- we’ll populate this from Firestore captain_name
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
  updateRoster: (division: Division, playerId: string) => void;
  calculatePoints: (p: Player) => number;
};

/** ---------- Scoring Table ---------- **/
export const SCORING = {
  touchdown: 6,
  passingTD: 4,
  minimalReception: 0,
  shortReception: 1,
  mediumReception: 2,
  longReception: 4,
  catch: 1,
  flagGrab: 1,
  sack: 3,
  interception: 5,
  passingInterception: -2,
} as const;

/** ---------- Helpers ---------- **/
const normDiv = (v: unknown): Division => {
  const s = String(v ?? '').toLowerCase();
  if (s.includes('girl') || s.includes('women') || s.includes('female')) return 'girls';
  return 'boys';
};

// “michigan-boys-1” | “michigan_boys_1” -> "Michigan"
const schoolFromTeamId = (teamId?: string) => {
  if (!teamId) return '';
  const slug = String(teamId).trim().replace(/_/g, '-');
  const first = slug.split('-')[0] ?? '';
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
};

// Pick a readable player name from various fields or fallback to slug
const resolvePlayerName = (data: any, fallbackId: string) => {
  if (data?.display_name) return data.display_name;

  // fallback: humanize the doc id if displayName not set
  return fallbackId
    .split('-')
    .map((w: string) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
};

// Convert seasonTotals array -> PlayerStats
const statsFromSeasonTotals = (arr?: number[]): PlayerStats => {
  const a = Array.isArray(arr) ? arr : [];
  return {
    touchdowns: a[0] ?? 0,
    passingTDs: a[1] ?? 0,
    minimalReceptions: a[2] ?? 0,
    shortReceptions: a[3] ?? 0,
    mediumReceptions: a[4] ?? 0,
    longReceptions: a[5] ?? 0,
    catches: a[6] ?? 0,
    flagsPulled: a[7] ?? 0,
    sacks: a[8] ?? 0,
    interceptions: a[9] ?? 0,
    passingInterceptions: a[10] ?? 0,
  };
};

/** ---------- Context ---------- **/
const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

/** ---------- Provider ---------- **/
export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [userRoster, setUserRoster] = useState<FantasyRoster>({ boys: [], girls: [] });

  // Load teams + players from Firestore once on mount
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        /** 1) Teams metadata */
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const teamMeta = new Map<
          string,
          { name: string; division: Division; captain: string; record: { wins: number; losses: number } }
        >();

        teamsSnap.forEach((d) => {
          const data = d.data() as any;
          const division: Division = data?.division ? normDiv(data.division) : normDiv(d.id);
          teamMeta.set(d.id, {
            name: data?.name || schoolFromTeamId(d.id),
            division,
            // ✅ prefer captain_name, fall back to captain
            captain: data?.captain_name ?? data?.captain ?? '',
            record: data?.record ?? { wins: 0, losses: 0 },
          });
        });

        /** 2) Players */
        const playersSnap = await getDocs(collection(db, 'players'));
        const playersByTeam = new Map<string, Player[]>();

        playersSnap.forEach((d) => {
          const data = d.data() as any;
          const teamId: string = data?.team_id ?? data?.teamID ?? data?.teamId ?? '';
          if (!teamId) return;
          
          const name = resolvePlayerName(data, d.id);
          const stats = statsFromSeasonTotals(data?.seasonTotals);
          const teamDiv = teamMeta.get(teamId)?.division ?? normDiv(teamId);

          const player: Player = {
            id: d.id,
            name,
            division: teamDiv,
            teamId,
            stats,
          };

          const list = playersByTeam.get(teamId) ?? [];
          list.push(player);
          playersByTeam.set(teamId, list);
        });

        /** 3) Build Team[] */
        const teamIds = Array.from(new Set([...playersByTeam.keys(), ...teamMeta.keys()]));
        const builtTeams: Team[] = teamIds.map((tid) => {
          const meta = teamMeta.get(tid);
          const players = (playersByTeam.get(tid) ?? []).sort((a, b) => a.name.localeCompare(b.name));
          return {
            id: tid,
            name: meta?.name ?? schoolFromTeamId(tid),
            division: meta?.division ?? normDiv(tid),
            captain: meta?.captain ?? '', // ✅ will now contain captain_name value
            record: meta?.record ?? { wins: 0, losses: 0 },
            players,
          };
        });

        if (active) setTeams(builtTeams);
      } catch (e) {
        console.warn('[TournamentContext] failed to load Firestore data:', e);
        if (active) setTeams([]);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  /** Toggle add/remove a player from a division list */
  const updateRoster = (division: Division, playerId: string) => {
    setUserRoster((prev) => {
      const list = prev[division] ?? [];
      const exists = list.includes(playerId);
      const nextList = exists ? list.filter((id) => id !== playerId) : [...list, playerId];
      return { ...prev, [division]: nextList };
    });
  };

  /** Fantasy scoring based on Player.stats */
  const calculatePoints = (p: Player) => {
    const s = p.stats;
    return (
      s.touchdowns * SCORING.touchdown +
      s.passingTDs * SCORING.passingTD +
      s.minimalReceptions * SCORING.minimalReception +
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
