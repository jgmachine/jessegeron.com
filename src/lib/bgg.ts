/**
 * BoardGameGeek API utilities
 * Reads local XML data files (no authentication required)
 */

import { parseStringPromise } from "xml2js";
import * as fs from "fs/promises";
import * as path from "path";

interface GameStats {
  totalGames: number;
  totalPlays: number;
  uniqueGames: number;
  mostRecentPlay: string;
  favoriteGames: Array<{
    name: string;
    rating: number;
    plays: number;
  }>;
}

/**
 * Fetch plays data from local XML file
 */
export async function fetchBGGPlays(username: string): Promise<GameStats | null> {
  try {
    // Read local XML file
    const filePath = path.join(process.cwd(), "public", "data", "bgg-plays.xml");
    const xmlContent = await fs.readFile(filePath, "utf-8");
    const data = await parseStringPromise(xmlContent);

    if (!data.plays || !data.plays.play) {
      return {
        totalGames: 0,
        totalPlays: 0,
        uniqueGames: 0,
        mostRecentPlay: "N/A",
        favoriteGames: [],
      };
    }

    // Handle both single play and array of plays
    const plays = Array.isArray(data.plays.play)
      ? data.plays.play
      : [data.plays.play];

    const gameMap = new Map<
      string,
      { name: string; rating: number; plays: number }
    >();
    let totalPlays = 0;
    let mostRecentPlay = "";

    plays.forEach((play: any) => {
      totalPlays++;

      // Get game info from the item element
      if (play.item && Array.isArray(play.item) && play.item.length > 0) {
        const item = play.item[0];
        const gameName = item.$?.name || "Unknown";
        const gameId = item.$?.objectid || "";

        // Count this as one play (quantity is per play record)
        if (!gameMap.has(gameId)) {
          gameMap.set(gameId, {
            name: gameName,
            rating: 0,
            plays: 1,
          });
        } else {
          const game = gameMap.get(gameId)!;
          game.plays += 1;
        }
      }

      // Track most recent play date
      const date = play.$?.date;
      if (date && (!mostRecentPlay || date > mostRecentPlay)) {
        mostRecentPlay = date;
      }
    });

    // Sort by plays to get favorites
    const favoriteGames = Array.from(gameMap.values())
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 5);

    return {
      totalGames: gameMap.size,
      totalPlays,
      uniqueGames: gameMap.size,
      mostRecentPlay: mostRecentPlay
        ? new Date(mostRecentPlay).toLocaleDateString()
        : "N/A",
      favoriteGames,
    };
  } catch (error) {
    console.error("Error reading BGG plays data:", error);
    return null;
  }
}

/**
 * Fetch collection data from local XML file
 */
export async function fetchBGGCollection(username: string): Promise<{
  count: number;
  value: number;
} | null> {
  try {
    // Read local XML file
    const filePath = path.join(process.cwd(), "public", "data", "bgg-collection.xml");
    const xmlContent = await fs.readFile(filePath, "utf-8");
    const data = await parseStringPromise(xmlContent);

    if (!data.items || !data.items.item) {
      return {
        count: 0,
        value: 0,
      };
    }

    const items = Array.isArray(data.items.item)
      ? data.items.item
      : [data.items.item];

    return {
      count: items.length,
      value: 0,
    };
  } catch (error) {
    console.error("Error reading BGG collection data:", error);
    return null;
  }
}
