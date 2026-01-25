/**
 * BoardGameArena stats library
 *
 * Reads BGA stats from the public/bga-stats.json file.
 * Data is manually updated periodically (BGA requires authentication).
 */

import fs from "fs/promises";
import path from "path";

/**
 * Per-game statistics from BoardGameArena
 */
export interface BGAGameStats {
  /** Game name */
  name: string;
  /** ELO rating for this game */
  elo?: number;
  /** Total matches played */
  matches?: number;
  /** Total wins */
  wins?: number;
  /** Current rank in leaderboards */
  rank?: number;
  /** Arena level (e.g., "Bronze", "Silver", "Gold") */
  arena?: string | null;
}

/**
 * Aggregate player statistics
 */
export interface BGATotals {
  /** Total games played across all games */
  matches?: number;
  /** Total wins across all games */
  wins?: number;
  /** Experience points */
  xp?: number;
  /** Prestige level */
  prestige?: number;
  /** Reputation/Karma score (0-100) */
  reputation?: number;
  /** Number of abandoned games */
  abandoned?: number;
  /** Number of timeouts */
  timeouts?: number;
}

/**
 * Daily play history entry for calendar heatmap
 */
export interface BGAPlayHistoryEntry {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Number of games played this day */
  count: number;
  /** Number of wins this day */
  wins: number;
  /** List of unique games played */
  games: string[];
}

/**
 * Complete BGA player statistics
 */
export interface BGAStats {
  /** Player ID */
  playerId: number;
  /** Display name */
  playerName: string;
  /** Avatar URL */
  avatar?: string | null;
  /** Aggregate statistics */
  totals: BGATotals;
  /** Per-game statistics */
  games: BGAGameStats[];
  /** Daily play history for calendar heatmap */
  playHistory?: BGAPlayHistoryEntry[];
  /** When the data was fetched (ISO timestamp) */
  fetchedAt: string;
  /** Whether this is demo/sample data */
  isDemo: boolean;
}

const DATA_PATH = "public/bga-stats.json";

/**
 * Returns default demo data when no real data is available
 */
function getDefaultStats(): BGAStats {
  return {
    playerId: 0,
    playerName: "Not Configured",
    avatar: null,
    totals: {},
    games: [],
    fetchedAt: new Date().toISOString(),
    isDemo: true,
  };
}

/**
 * Loads BGA stats from the pre-fetched JSON file
 *
 * @returns Promise<BGAStats> - The player's BGA statistics
 */
export async function getBGAStats(): Promise<BGAStats> {
  try {
    const filePath = path.resolve(process.cwd(), DATA_PATH);
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as BGAStats;
  } catch (error) {
    console.warn("Could not load BGA stats:", (error as Error).message);
    return getDefaultStats();
  }
}

/**
 * Gets the win rate for a specific game
 *
 * @param stats - Full BGA stats object
 * @param gameName - Name of the game (case-insensitive)
 * @returns Win percentage (0-100) or null if game not found
 */
export function getGameWinRate(stats: BGAStats, gameName: string): number | null {
  const game = stats.games.find(
    (g) => g.name.toLowerCase() === gameName.toLowerCase()
  );

  if (!game || !game.matches || !game.wins) return null;
  return Math.round((game.wins / game.matches) * 100);
}

/**
 * Gets the overall win rate across all games
 *
 * @param stats - Full BGA stats object
 * @returns Win percentage (0-100) or null if no data
 */
export function getOverallWinRate(stats: BGAStats): number | null {
  if (!stats.totals.matches || !stats.totals.wins) {
    // Calculate from individual games if totals not available
    const totalMatches = stats.games.reduce((sum, g) => sum + (g.matches || 0), 0);
    const totalWins = stats.games.reduce((sum, g) => sum + (g.wins || 0), 0);

    if (totalMatches === 0) return null;
    return Math.round((totalWins / totalMatches) * 100);
  }

  return Math.round((stats.totals.wins / stats.totals.matches) * 100);
}

/**
 * Gets games sorted by ELO rating (highest first)
 *
 * @param stats - Full BGA stats object
 * @param limit - Maximum number of games to return
 * @returns Array of games sorted by ELO
 */
export function getTopGamesByElo(stats: BGAStats, limit = 5): BGAGameStats[] {
  return [...stats.games]
    .filter((g) => g.elo !== undefined)
    .sort((a, b) => (b.elo || 0) - (a.elo || 0))
    .slice(0, limit);
}

/**
 * Gets games sorted by number of matches played (most first)
 *
 * @param stats - Full BGA stats object
 * @param limit - Maximum number of games to return
 * @returns Array of games sorted by matches played
 */
export function getMostPlayedGames(stats: BGAStats, limit = 5): BGAGameStats[] {
  return [...stats.games]
    .filter((g) => g.matches !== undefined)
    .sort((a, b) => (b.matches || 0) - (a.matches || 0))
    .slice(0, limit);
}

/**
 * Gets games that have arena rankings
 *
 * @param stats - Full BGA stats object
 * @returns Array of games with arena rankings
 */
export function getArenaGames(stats: BGAStats): BGAGameStats[] {
  return stats.games.filter((g) => g.arena);
}

/**
 * Checks how fresh the data is
 *
 * @param stats - Full BGA stats object
 * @returns Object with age in hours and whether it's stale (>24h)
 */
export function getDataFreshness(stats: BGAStats): {
  ageHours: number;
  isStale: boolean;
} {
  const fetchedAt = new Date(stats.fetchedAt);
  const ageMs = Date.now() - fetchedAt.getTime();
  const ageHours = Math.round(ageMs / (1000 * 60 * 60));

  return {
    ageHours,
    isStale: ageHours > 24,
  };
}
