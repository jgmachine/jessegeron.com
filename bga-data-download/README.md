# BGA Stats Data Update Process

This document explains how to update the BoardGameArena play history data used for the calendar heatmap visualization.

## Quick Start

```bash
# 1. Download your game history from BGA (see instructions below)
# 2. Run the update script
npm run update:bga
```

## Data Location

- **Main data file**: `/public/bga-stats.json`
- **Downloaded HTML**: `/bga-data-download/` (drop HTML files here)
- **Processed tables tracking**: `/bga-data-download/processed-tables.json` (auto-generated)

## Data Structure

The `playHistory` array in `bga-stats.json` contains entries like:

```json
{
  "date": "2025-12-15",
  "count": 3,
  "wins": 2,
  "games": ["Azul", "Ticket to Ride", "Azul"]
}
```

- `date`: YYYY-MM-DD format
- `count`: Total games played that day
- `wins`: Number of 1st place finishes
- `games`: List of game names (includes duplicates if same game played multiple times)

## How to Update

### Step 1: Download Your Game History

1. **Log into BoardGameArena** in Chrome
2. **Navigate to your game history**: `https://boardgamearena.com/gamestats?player=95446131`
3. **Click "See more"** until you see all recent games you want to add
4. **Download the page** (Cmd+S / Ctrl+S) to the `bga-data-download/` folder

### Step 2: Run the Update Script

```bash
npm run update:bga
```

The script will:
- Parse all HTML files in `bga-data-download/`
- Extract game entries (game name, date, placement, table ID)
- Use table IDs to deduplicate (avoids adding the same game twice)
- Merge new entries with existing `playHistory`
- Update `bga-stats.json`

### Deduplication

The script tracks processed games using BGA's unique table IDs (stored in `processed-tables.json`). This means:
- You can safely re-download pages with overlapping games
- Only truly new games will be added
- Running the script multiple times on the same HTML won't create duplicates

To force a full re-process, delete `processed-tables.json`.

## Parsing Details

The HTML contains game entries with this structure:
- Game name in `<a class="table_name gamename">`
- Table ID in `table?table=XXXXXX`
- Date/time like `01/18/2026 at 14:30` or relative like `2 hours ago`
- Placement in `<div class="rank">1st</div>` (1st = win for jg_machine)

## Tips

- The heatmap shows the last 12 months, so older data beyond that won't be visible
- Win rate colors: Green (≥50% wins), Blue (<50% wins)
- Intensity increases with more games per day (1, 2-3, 4-6, 7+ games)
- Games array shows duplicates, so you can see which games were played multiple times on the same day
