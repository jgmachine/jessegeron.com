/**
 * Extended BGG data parsing for visualizations
 */

import { parseStringPromise } from "xml2js";
import * as fs from "fs/promises";
import * as path from "path";

export interface Play {
  id: string;
  date: string;
  gameName: string;
  gameId: string;
  location: string;
  length: number;
  incomplete: boolean;
  yourScore: number;
  yourWin: boolean;
  players: Array<{
    name: string;
    score: number;
    win: boolean;
  }>;
  playerCount: number;
}

export interface WinRate {
  gameId: string;
  gameName: string;
  plays: number;
  wins: number;
  winPercentage: number;
}

/**
 * Parse plays XML and return structured play data
 */
export async function getParsedPlays(): Promise<Play[]> {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "bgg-plays.xml");
    const xmlContent = await fs.readFile(filePath, "utf-8");
    const data = await parseStringPromise(xmlContent);

    if (!data.plays || !data.plays.play) {
      return [];
    }

    const plays = Array.isArray(data.plays.play)
      ? data.plays.play
      : [data.plays.play];

    return plays
      .map((play: any): Play => {
        const gameName = play.item?.[0]?.$?.name || "Unknown";
        const gameId = play.item?.[0]?.$?.objectid || "";
        const date = play.$?.date || "";
        const location = play.$?.location || "";
        const length = parseInt(play.$?.length || "0", 10);
        const incomplete = play.$?.incomplete === "1";

        // Find Jesse's data
        const players = play.players?.[0]?.player || [];
        const playerArray = Array.isArray(players) ? players : [players];

        let yourScore = 0;
        let yourWin = false;
        const playerList = playerArray.map((p: any) => ({
          name: p.$?.name || "Unknown",
          score: parseInt(p.$?.score || "0", 10),
          win: p.$?.win === "1",
        }));

        // Find "Jesse" in the player list
        const jessePlayer = playerArray.find(
          (p: any) => p.$?.name?.toLowerCase() === "jesse"
        );
        if (jessePlayer) {
          yourScore = parseInt(jessePlayer.$?.score || "0", 10);
          yourWin = jessePlayer.$?.win === "1";
        }

        return {
          id: play.$?.id || "",
          date,
          gameName,
          gameId,
          location,
          length,
          incomplete,
          yourScore,
          yourWin,
          players: playerList,
          playerCount: playerArray.length,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Most recent first
  } catch (error) {
    console.error("Error parsing plays:", error);
    return [];
  }
}

/**
 * Get yearly play counts
 */
export async function getPlaysByYear(): Promise<
  Array<{ year: number; plays: number }>
> {
  const plays = await getParsedPlays();

  const yearMap = new Map<number, number>();

  plays.forEach((play) => {
    const playDate = new Date(play.date);
    const year = playDate.getFullYear();

    if (!yearMap.has(year)) {
      yearMap.set(year, 0);
    }
    yearMap.set(year, (yearMap.get(year) || 0) + 1);
  });

  return Array.from(yearMap.entries())
    .map(([year, plays]) => ({ year, plays }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Get top games of all time
 */
export async function getTopGamesAllTime(): Promise<
  Array<{ name: string; plays: number }>
> {
  const plays = await getParsedPlays();

  const gameMap = new Map<string, number>();

  plays.forEach((play) => {
    if (!gameMap.has(play.gameName)) {
      gameMap.set(play.gameName, 0);
    }
    gameMap.set(play.gameName, (gameMap.get(play.gameName) || 0) + 1);
  });

  return Array.from(gameMap.entries())
    .map(([name, plays]) => ({ name, plays }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 10);
}

/**
 * Get top games from the last 6 months
 */
export async function getTopGamesLastSixMonths(): Promise<
  Array<{ name: string; plays: number }>
> {
  const plays = await getParsedPlays();

  // Get plays from last 6 months
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentPlays = plays.filter((play) => {
    const playDate = new Date(play.date);
    return playDate >= sixMonthsAgo && playDate <= now;
  });

  // Count plays by game
  const gameMap = new Map<string, number>();

  recentPlays.forEach((play) => {
    if (!gameMap.has(play.gameName)) {
      gameMap.set(play.gameName, 0);
    }
    gameMap.set(play.gameName, (gameMap.get(play.gameName) || 0) + 1);
  });

  // Convert to array, sort by plays, and return top 10
  return Array.from(gameMap.entries())
    .map(([name, plays]) => ({ name, plays }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 10);
}

/**
 * Get player frequency (who you play with most)
 */
export async function getPlayerFrequency(): Promise<
  Array<{ name: string; gameCount: number; winCount: number }>
> {
  const plays = await getParsedPlays();

  const playerStats = new Map<
    string,
    { gameCount: number; winCount: number }
  >();

  plays.forEach((play) => {
    play.players.forEach((player) => {
      if (player.name.toLowerCase() !== "jesse") {
        if (!playerStats.has(player.name)) {
          playerStats.set(player.name, { gameCount: 0, winCount: 0 });
        }
        const stat = playerStats.get(player.name)!;
        stat.gameCount++;
        if (player.win) stat.winCount++;
      }
    });
  });

  return Array.from(playerStats.entries())
    .map(([name, stat]) => ({ name, ...stat }))
    .sort((a, b) => b.gameCount - a.gameCount); // Most frequent first
}

export interface MonthlyStats {
  month: string;
  date: Date;
  plays: number;
  wins: number;
  losses: number;
  na: number; // No winner tracked (ties, co-op, or not recorded)
}

export interface YearlyStats {
  year: number;
  plays: number;
  wins: number;
  losses: number;
  na: number;
}

export interface CoopVsCompetitiveStats {
  cooperative: {
    wins: number;
    losses: number;
    total: number;
  };
  competitive: {
    wins: number;
    losses: number;
    total: number;
  };
}

/**
 * Get plays aggregated by month (last 12 months) with win/loss breakdown
 */
export async function getPlaysByMonth(): Promise<MonthlyStats[]> {
  const plays = await getParsedPlays();

  if (plays.length === 0) {
    return [];
  }

  // Get the date range (last 12 months including current month)
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  // Calculate date from 12 months ago
  let oneYearAgo = new Date(now);
  oneYearAgo.setMonth(oneYearAgo.getMonth() - 11);
  oneYearAgo.setDate(1);
  oneYearAgo.setHours(0, 0, 0, 0);

  // Create a map of months with win/loss tracking
  const monthMap = new Map<string, { plays: number; wins: number; losses: number; na: number }>();

  // Initialize months
  for (let i = 0; i < 12; i++) {
    const date = new Date(oneYearAgo);
    date.setMonth(date.getMonth() + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, { plays: 0, wins: 0, losses: 0, na: 0 });
  }

  // Count plays by month with win/loss
  plays.forEach((play) => {
    try {
      const playDate = new Date(play.date);
      playDate.setHours(0, 0, 0, 0);

      if (playDate >= oneYearAgo && playDate <= now) {
        const key = `${playDate.getFullYear()}-${String(playDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthMap.has(key)) {
          const stats = monthMap.get(key)!;
          stats.plays++;

          // Check if player data exists - if players are recorded, we have win/loss data
          // (even if all players have win=0, that means nobody won / co-op loss)
          const hasPlayerData = play.players.length > 0;

          if (!hasPlayerData) {
            stats.na++;
          } else if (play.yourWin) {
            stats.wins++;
          } else {
            stats.losses++;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing play date:', play.date, e);
    }
  });

  // Convert to array and format
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return Array.from(monthMap.entries())
    .map(([key, stats]) => {
      const [year, month] = key.split('-');
      const monthNum = parseInt(month) - 1;
      const date = new Date(parseInt(year), monthNum, 1);
      return {
        month: monthNames[monthNum],
        date,
        plays: stats.plays,
        wins: stats.wins,
        losses: stats.losses,
        na: stats.na,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Get yearly play counts with win/loss breakdown
 */
export async function getPlaysByYearWithStats(): Promise<YearlyStats[]> {
  const plays = await getParsedPlays();

  const yearMap = new Map<number, { plays: number; wins: number; losses: number; na: number }>();

  plays.forEach((play) => {
    const playDate = new Date(play.date);
    const year = playDate.getFullYear();

    if (!yearMap.has(year)) {
      yearMap.set(year, { plays: 0, wins: 0, losses: 0, na: 0 });
    }

    const stats = yearMap.get(year)!;
    stats.plays++;

    // Check if player data exists - if players are recorded, we have win/loss data
    // (even if all players have win=0, that means nobody won / co-op loss)
    const hasPlayerData = play.players.length > 0;

    if (!hasPlayerData) {
      stats.na++;
    } else if (play.yourWin) {
      stats.wins++;
    } else {
      stats.losses++;
    }
  });

  return Array.from(yearMap.entries())
    .map(([year, stats]) => ({ year, ...stats }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Determine if a play is cooperative based on whether all players share the same win status
 */
function isCooperativePlay(players: Array<{ name: string; score: number; win: boolean }>): boolean {
  if (players.length === 0) return false;

  // A game is cooperative if all players have the same win status
  const firstWin = players[0].win;
  return players.every(p => p.win === firstWin);
}

/**
 * Get win/loss stats split by cooperative vs competitive games
 */
export async function getCoopVsCompetitiveStats(): Promise<CoopVsCompetitiveStats> {
  const plays = await getParsedPlays();

  const stats: CoopVsCompetitiveStats = {
    cooperative: { wins: 0, losses: 0, total: 0 },
    competitive: { wins: 0, losses: 0, total: 0 },
  };

  plays.forEach((play) => {
    // Skip plays without player data
    if (play.players.length === 0) return;

    const isCoop = isCooperativePlay(play.players);

    if (isCoop) {
      stats.cooperative.total++;
      if (play.yourWin) {
        stats.cooperative.wins++;
      } else {
        stats.cooperative.losses++;
      }
    } else {
      stats.competitive.total++;
      if (play.yourWin) {
        stats.competitive.wins++;
      } else {
        stats.competitive.losses++;
      }
    }
  });

  return stats;
}
