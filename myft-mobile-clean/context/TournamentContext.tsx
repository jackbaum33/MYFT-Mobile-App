// context/TournamentContext.tsx - FIXED FOR STABLE RENDERS
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
  captain: string;
  record: { wins: number; losses: number };
  players: Player[];
  pointDifferential?: number;
}

export interface FantasyRoster {
  boys: string[];
  girls: string[];
}

type TournamentContextType = {
  teams: Team[];
  userRoster: FantasyRoster;
  loading: boolean;
  updateRoster: (division: Division, playerId: string) => void;
  calculatePoints: (p: Player) => number;
  refreshData: () => Promise<void>;
  refreshTrigger: number;
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

const schoolFromTeamId = (teamId?: string) => {
  if (!teamId) return '';
  const slug = String(teamId).trim().replace(/_/g, '-');
  const first = slug.split('-')[0] ?? '';
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
};

const resolvePlayerName = (data: any, fallbackId: string) => {
  if (data?.display_name) return data.display_name;
  return fallbackId
    .split('-')
    .map((w: string) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
};

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

/** ---------- Data Loading Function ---------- **/
const loadTeamsAndPlayers = async (): Promise<Team[]> => {
  const teamsSnap = await getDocs(collection(db, 'teams'));
  const teamMeta = new Map<
    string,
    { 
      name: string; 
      division: Division; 
      captain: string; 
      record: { wins: number; losses: number };
      pointDifferential?: number;
    }
  >();

  teamsSnap.forEach((d) => {
    const data = d.data() as any;
    const division: Division = data?.division ? normDiv(data.division) : normDiv(d.id);
    
    let record = { wins: 0, losses: 0 };
    if (Array.isArray(data?.record)) {
      record = {
        wins: data.record[0] ?? 0,
        losses: data.record[1] ?? 0,
      };
    } else if (data?.record && typeof data.record === 'object') {
      record = {
        wins: data.record.wins ?? 0,
        losses: data.record.losses ?? 0,
      };
    }

    teamMeta.set(d.id, {
      name: data?.name || schoolFromTeamId(d.id),
      division,
      captain: data?.captain_name ?? data?.captain ?? '',
      record,
      pointDifferential: data?.pointDifferential,
    });
  });

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

  const teamIds = Array.from(new Set([...playersByTeam.keys(), ...teamMeta.keys()]));
  const builtTeams: Team[] = teamIds.map((tid) => {
    const meta = teamMeta.get(tid);
    const players = (playersByTeam.get(tid) ?? []).sort((a, b) => a.name.localeCompare(b.name));
    return {
      id: tid,
      name: meta?.name ?? schoolFromTeamId(tid),
      division: meta?.division ?? normDiv(tid),
      captain: meta?.captain ?? '',
      record: meta?.record ?? { wins: 0, losses: 0 },
      players,
      pointDifferential: meta?.pointDifferential,
    };
  });

  return builtTeams;
};

/** ---------- Context ---------- **/
const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

/** ---------- Provider ---------- **/
export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [userRoster, setUserRoster] = useState<FantasyRoster>({ boys: [], girls: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // CRITICAL FIX: Use ref to prevent refresh during active operations
  const isRefreshingRef = useRef(false);

  // CRITICAL FIX: Memoize loadData to prevent recreation
  const loadData = useCallback(async () => {
    // Prevent overlapping refreshes
    if (isRefreshingRef.current) {
      console.log('[TournamentContext] Skipping refresh - already in progress');
      return;
    }

    try {
      isRefreshingRef.current = true;
      setLoading(true);
      const builtTeams = await loadTeamsAndPlayers();
      setTeams(builtTeams);
    } catch (e) {
      console.warn('[TournamentContext] failed to load Firestore data:', e);
      setTeams([]);
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // CRITICAL FIX: Stable refreshData function
  const refreshData = useCallback(async () => {
    console.log('[TournamentContext] Manual refresh triggered');
    await loadData();
    setRefreshTrigger((prev) => prev + 1);
  }, [loadData]);

  // CRITICAL FIX: Memoize updateRoster to prevent recreation
  const updateRoster = useCallback((division: Division, playerId: string) => {
    setUserRoster((prev) => {
      const list = prev[division] ?? [];
      const exists = list.includes(playerId);
      const nextList = exists ? list.filter((id) => id !== playerId) : [...list, playerId];
      return { ...prev, [division]: nextList };
    });
  }, []);

  // CRITICAL FIX: Memoize calculatePoints to prevent recreation
  const calculatePoints = useCallback((p: Player) => {
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
  }, []);

  // CRITICAL FIX: Only include stable dependencies
  const value = useMemo(
    () => ({ 
      teams, 
      userRoster, 
      loading, 
      updateRoster, 
      calculatePoints, 
      refreshData,
      refreshTrigger 
    }),
    [teams, userRoster, loading, updateRoster, calculatePoints, refreshData, refreshTrigger]
  );

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>;
};

/** ---------- Hook ---------- **/
export const useTournament = () => {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournament must be used within a TournamentProvider');
  return ctx;
};