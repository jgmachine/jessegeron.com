#!/usr/bin/env node
/*
 Script to parse BGA HTML game history and merge with existing bga-stats.json.

 Usage:
   node scripts/update-bga-stats.js              # Incremental update (skip already processed tables)
   node scripts/update-bga-stats.js --full-refresh  # Full rebuild from HTML (ignores processed-tables.json)

 This script:
 1. Finds all HTML files in bga-data-download/
 2. Parses game entries (game name, date, placement)
 3. In incremental mode: merges with existing playHistory, deduplicating by table ID
 4. In full-refresh mode: rebuilds playHistory from scratch using HTML data only
 5. Updates the bga-stats.json file

 The HTML is expected to be a saved BGA game history page from:
 https://boardgamearena.com/gamestats?player=YOUR_PLAYER_ID
*/

import fs from 'fs/promises';
import path from 'path';

const BGA_DATA_DIR = path.resolve('bga-data-download');
const STATS_FILE = path.resolve('public', 'bga-stats.json');
const PROCESSED_TABLES_FILE = path.resolve('bga-data-download', 'processed-tables.json');

// Player ID to look for in rankings
const PLAYER_ID = '95446131';
const PLAYER_NAME = 'jg_machine';

// Parse command line arguments
const FULL_REFRESH = process.argv.includes('--full-refresh');

/**
 * Parse a relative time string and return today's date in YYYY-MM-DD format
 * Handles: "27 minutes ago", "2 hours ago", "Yesterday", "1 day ago", "today at HH:MM"
 */
function parseRelativeDate(timeStr) {
  const now = new Date();
  const lowerStr = timeStr.toLowerCase();

  // "today at HH:MM" format
  if (lowerStr.startsWith('today')) {
    return formatDate(now);
  }

  if (lowerStr.includes('minute') || lowerStr.includes('hour') || lowerStr.includes('second')) {
    // Same day
    return formatDate(now);
  }

  if (lowerStr === 'yesterday' || lowerStr.includes('1 day ago')) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDate(yesterday);
  }

  const daysMatch = timeStr.match(/(\d+)\s*days?\s*ago/i);
  if (daysMatch) {
    const daysAgo = parseInt(daysMatch[1], 10);
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - daysAgo);
    return formatDate(pastDate);
  }

  return null; // Couldn't parse
}

/**
 * Format a Date object to YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse game entries from BGA HTML content
 * Returns array of { tableId, gameName, date (YYYY-MM-DD), isWin (boolean) }
 */
function parseGameEntries(html) {
  const entries = [];

  // Split by table rows - each <tr> contains one game entry
  // The structure is: <tr><td>...game name...</td><td>...date...</td><td>...scores...</td>...</tr>
  const rowMatches = html.match(/<tr><td[^>]*>[\s\S]*?<\/tr>/g) || [];

  for (const row of rowMatches) {
    // Must contain a game name with class="table_name gamename"
    const gameNameMatch = row.match(/class="table_name gamename">([^<]+)<\/a>/);
    if (!gameNameMatch) continue;

    const gameName = gameNameMatch[1].trim();

    // Extract table ID (unique identifier for each game)
    const tableIdMatch = row.match(/table\?table=(\d+)/);
    const tableId = tableIdMatch ? tableIdMatch[1] : null;

    // Find the date - could be absolute (MM/DD/YYYY) or relative (X hours ago, today at HH:MM)
    let isoDate = null;

    // Try absolute date first (MM/DD/YYYY at HH:MM)
    const absoluteDateMatch = row.match(/<div class="smalltext">(\d{2}\/\d{2}\/\d{4}) at \d{2}:\d{2}<\/div>/);
    if (absoluteDateMatch) {
      const [month, day, year] = absoluteDateMatch[1].split('/');
      isoDate = `${year}-${month}-${day}`;
    } else {
      // Try relative date (including "today at HH:MM", "X minutes/hours ago", "Yesterday")
      const relativeDateMatch = row.match(/<div class="smalltext">([^<]*(?:ago|Yesterday|today)[^<]*)<\/div>/i);
      if (relativeDateMatch) {
        isoDate = parseRelativeDate(relativeDateMatch[1]);
      }
    }

    if (!isoDate) {
      console.log(`        [skip] Could not parse date for game: ${gameName}`);
      continue;
    }

    // Find jg_machine's rank in this game
    // Look for pattern: <div class="rank">Nth</div><div class="name"><a...>jg_machine</a></div>
    const rankPattern = new RegExp(
      `<div class="rank">(\\w+)</div><div class="name"><a[^>]*>${PLAYER_NAME}</a>`,
      'i'
    );
    const rankMatch = row.match(rankPattern);

    if (!rankMatch) {
      console.log(`        [skip] Could not find ${PLAYER_NAME}'s rank for: ${gameName} on ${isoDate} (table ${tableId})`);
      continue;
    }

    const rank = rankMatch[1]; // "1st", "2nd", etc.
    const isWin = rank === '1st';

    entries.push({
      tableId,
      gameName,
      date: isoDate,
      isWin
    });
  }

  return entries;
}

/**
 * Load processed table IDs from tracking file
 */
async function loadProcessedTables() {
  try {
    const raw = await fs.readFile(PROCESSED_TABLES_FILE, 'utf8');
    return new Set(JSON.parse(raw));
  } catch (err) {
    return new Set();
  }
}

/**
 * Save processed table IDs to tracking file
 */
async function saveProcessedTables(tableIds) {
  await fs.writeFile(PROCESSED_TABLES_FILE, JSON.stringify([...tableIds], null, 2), 'utf8');
}

/**
 * Filter out already processed entries using table IDs
 * Returns only new entries that haven't been processed before
 */
function filterNewEntries(entries, processedTables) {
  const newEntries = [];
  const skipped = [];

  for (const entry of entries) {
    if (entry.tableId && processedTables.has(entry.tableId)) {
      skipped.push(entry);
    } else {
      newEntries.push(entry);
    }
  }

  return { newEntries, skipped };
}

/**
 * Group game entries by date
 * Returns map of date -> { count, wins, games: array with duplicates }
 */
function groupByDate(entries) {
  const byDate = new Map();

  for (const entry of entries) {
    if (!byDate.has(entry.date)) {
      byDate.set(entry.date, { count: 0, wins: 0, games: [] });
    }

    const day = byDate.get(entry.date);
    day.count++;
    if (entry.isWin) day.wins++;
    day.games.push(entry.gameName); // Keep duplicates to show multiple plays
  }

  return byDate;
}

/**
 * Merge new entries with existing playHistory
 * Since we're using table IDs for deduplication, we can simply add new entries
 */
function mergePlayHistory(existingHistory, newEntriesByDate) {
  // Create a map of existing data for quick lookup
  // Keep games as array to preserve duplicates
  const existingByDate = new Map();
  for (const entry of existingHistory) {
    existingByDate.set(entry.date, {
      count: entry.count,
      wins: entry.wins,
      games: [...entry.games] // Copy array
    });
  }

  // Track what we're adding
  let addedDates = 0;
  let updatedDates = 0;
  let addedGames = 0;

  // Merge new entries (these are already filtered to only new table IDs)
  for (const [date, newData] of newEntriesByDate) {
    if (!existingByDate.has(date)) {
      // New date entirely
      existingByDate.set(date, {
        count: newData.count,
        wins: newData.wins,
        games: [...newData.games]
      });
      addedDates++;
      addedGames += newData.count;
    } else {
      // Date exists - add to existing counts
      const existing = existingByDate.get(date);

      // Since we're using table IDs, we know these are new games to add
      existing.count += newData.count;
      existing.wins += newData.wins;

      // Add game names (append to array, keeping duplicates)
      existing.games.push(...newData.games);

      updatedDates++;
      addedGames += newData.count;
    }
  }

  // Convert back to array format, sorted by date descending
  // Sort games alphabetically within each day
  const merged = Array.from(existingByDate.entries())
    .map(([date, data]) => ({
      date,
      count: data.count,
      wins: data.wins,
      games: data.games.sort()
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return { merged, addedDates, updatedDates, addedGames };
}

/**
 * Update game stats based on play history
 * When fullRefresh is true, recalculate matches and wins from entries
 */
function recalculateGameStats(existingGames, playHistory, entries = null) {
  // Create a map of game stats
  const gameStatsMap = new Map();

  // Initialize from existing games (to preserve ELO, arena, etc.)
  for (const game of existingGames) {
    gameStatsMap.set(game.name, { ...game });
  }

  // If we have individual entries (full refresh), use them for accurate counts
  if (entries && entries.length > 0) {
    // Count matches and wins per game from entries
    const matchCounts = new Map();
    const winCounts = new Map();

    for (const entry of entries) {
      const name = entry.gameName;
      matchCounts.set(name, (matchCounts.get(name) || 0) + 1);
      if (entry.isWin) {
        winCounts.set(name, (winCounts.get(name) || 0) + 1);
      }
    }

    // Update or create game entries with accurate counts
    for (const [gameName, matches] of matchCounts) {
      const wins = winCounts.get(gameName) || 0;
      const winPct = matches > 0 ? Math.round((wins / matches) * 100) : 0;

      if (gameStatsMap.has(gameName)) {
        const existing = gameStatsMap.get(gameName);
        existing.matches = matches;
        existing.wins = wins;
        existing.winPct = winPct;
      } else {
        gameStatsMap.set(gameName, {
          name: gameName,
          elo: 1,
          matches,
          wins,
          winPct
        });
      }
    }
  } else {
    // Just ensure new games from playHistory are in the list
    for (const day of playHistory) {
      for (const gameName of day.games) {
        if (!gameStatsMap.has(gameName)) {
          gameStatsMap.set(gameName, {
            name: gameName,
            elo: 1,
            matches: 0,
            wins: 0,
            winPct: 0
          });
        }
      }
    }
  }

  // Convert back to array, sorted by ELO descending
  return Array.from(gameStatsMap.values())
    .sort((a, b) => (b.elo || 0) - (a.elo || 0));
}

async function main() {
  console.log('BGA Stats Update Script');
  console.log('=======================');
  if (FULL_REFRESH) {
    console.log('MODE: Full refresh (rebuilding from HTML)\n');
  } else {
    console.log('MODE: Incremental update\n');
  }

  // Read existing stats
  let existingStats;
  try {
    const raw = await fs.readFile(STATS_FILE, 'utf8');
    existingStats = JSON.parse(raw);
    console.log(`[read] Loaded existing stats from ${STATS_FILE}`);
    console.log(`       - ${existingStats.playHistory?.length || 0} existing play dates`);
    console.log(`       - ${existingStats.games?.length || 0} existing games`);
  } catch (err) {
    console.error(`[error] Could not read ${STATS_FILE}:`, err.message);
    process.exit(1);
  }

  // Load processed table IDs for deduplication (only in incremental mode)
  let processedTables = new Set();
  if (!FULL_REFRESH) {
    processedTables = await loadProcessedTables();
    console.log(`       - ${processedTables.size} previously processed table IDs`);
  } else {
    console.log(`       - Ignoring processed tables (full refresh mode)`);
  }

  // Find HTML files in bga-data-download/
  let htmlFiles = [];
  try {
    const files = await fs.readdir(BGA_DATA_DIR);
    htmlFiles = files.filter(f => f.endsWith('.html'));
    console.log(`\n[scan] Found ${htmlFiles.length} HTML file(s) in ${BGA_DATA_DIR}/`);
  } catch (err) {
    console.error(`[error] Could not read ${BGA_DATA_DIR}:`, err.message);
    process.exit(1);
  }

  if (htmlFiles.length === 0) {
    console.log('\n[done] No HTML files found to process.');
    process.exit(0);
  }

  // Parse all HTML files
  const allEntries = [];
  for (const file of htmlFiles) {
    const filePath = path.join(BGA_DATA_DIR, file);
    console.log(`\n[parse] ${file}`);

    try {
      const html = await fs.readFile(filePath, 'utf8');
      const entries = parseGameEntries(html);
      console.log(`        Found ${entries.length} game entries in HTML`);

      if (entries.length > 0) {
        const dates = [...new Set(entries.map(e => e.date))].sort();
        console.log(`        Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
        allEntries.push(...entries);
      }
    } catch (err) {
      console.error(`[error] Could not process ${file}:`, err.message);
    }
  }

  if (allEntries.length === 0) {
    console.log('\n[done] No game entries found in HTML files.');
    process.exit(0);
  }

  console.log(`\n[total] ${allEntries.length} game entries parsed from all files`);

  // In full refresh mode, use all entries; otherwise filter by processed table IDs
  let newEntries;
  if (FULL_REFRESH) {
    newEntries = allEntries;
    console.log(`        Using all ${newEntries.length} entries (full refresh mode)`);
  } else {
    const filtered = filterNewEntries(allEntries, processedTables);
    newEntries = filtered.newEntries;
    console.log(`        ${filtered.skipped.length} entries skipped (already processed)`);
    console.log(`        ${newEntries.length} new entries to add`);

    if (newEntries.length === 0) {
      console.log('\n[done] No new game entries to add.');
      process.exit(0);
    }
  }

  // Group by date
  const byDate = groupByDate(newEntries);
  console.log(`        ${byDate.size} unique dates with games`);

  let merged;
  if (FULL_REFRESH) {
    // Full refresh: build playHistory from scratch using only HTML data
    merged = Array.from(byDate.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        wins: data.wins,
        games: data.games.sort()
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    console.log('\n[rebuild] Full refresh results:');
    console.log(`        - ${merged.length} total dates in history`);
    console.log(`        - ${newEntries.length} total game plays`);
  } else {
    // Incremental: merge with existing
    const existingHistory = existingStats.playHistory || [];
    const mergeResult = mergePlayHistory(existingHistory, byDate);
    merged = mergeResult.merged;

    console.log('\n[merge] Results:');
    console.log(`        - ${mergeResult.addedDates} new dates added`);
    console.log(`        - ${mergeResult.updatedDates} existing dates updated`);
    console.log(`        - ${mergeResult.addedGames} new game plays added`);
    console.log(`        - ${merged.length} total dates in history`);
  }

  // Update games list to include any new games
  // In full refresh mode, pass the entries for accurate match/win counting
  const updatedGames = recalculateGameStats(
    existingStats.games || [],
    merged,
    FULL_REFRESH ? newEntries : null
  );

  // Calculate new totals
  const totalMatches = merged.reduce((sum, day) => sum + day.count, 0);
  const totalWins = merged.reduce((sum, day) => sum + day.wins, 0);

  // Update stats object
  const updatedStats = {
    ...existingStats,
    totals: {
      ...existingStats.totals,
      matches: totalMatches
    },
    games: updatedGames,
    playHistory: merged,
    fetchedAt: new Date().toISOString()
  };

  // Write updated stats
  await fs.writeFile(STATS_FILE, JSON.stringify(updatedStats, null, 2), 'utf8');
  console.log(`\n[write] Updated ${STATS_FILE}`);
  console.log(`        - Total matches: ${totalMatches}`);
  console.log(`        - Total wins: ${totalWins}`);

  // Update processed tables tracking
  if (FULL_REFRESH) {
    // Reset processed tables with all table IDs from HTML
    const allTableIds = new Set();
    for (const entry of newEntries) {
      if (entry.tableId) {
        allTableIds.add(entry.tableId);
      }
    }
    await saveProcessedTables(allTableIds);
    console.log(`        - ${allTableIds.size} table IDs saved (reset for full refresh)`);
  } else {
    // Add new table IDs to existing processed set
    for (const entry of newEntries) {
      if (entry.tableId) {
        processedTables.add(entry.tableId);
      }
    }
    await saveProcessedTables(processedTables);
    console.log(`        - ${processedTables.size} total processed table IDs saved`);
  }

  console.log('\n[done] BGA stats updated successfully!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
