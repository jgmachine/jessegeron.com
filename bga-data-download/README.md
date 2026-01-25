# BGA Stats Data Update Process

This document explains how to update the BoardGameArena play history data used for the calendar heatmap visualization.

## Data Location

- **Main data file**: `/public/bga-stats.json`
- **Downloaded HTML backup**: `/bga-data-download/`

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
- `games`: List of game names (may have duplicates if same game played multiple times)

## How to Update

### Option 1: Incremental Update (Recommended)

For adding recent games without re-downloading everything:

1. **Log into BoardGameArena** in Chrome
2. **Navigate to your game history**: `https://boardgamearena.com/gamestats?player=YOUR_PLAYER_ID`
3. **Click "See more"** until you see games you already have (check the last date in your current data)
4. **Download the page** (Cmd+S / Ctrl+S) to the `bga-data-download/` folder
5. **Ask Claude** to parse the new data and merge it with existing `playHistory`

Claude will:
- Parse the HTML to extract new game entries
- Merge with existing data (adding to counts for existing dates, creating new date entries)
- Update `bga-stats.json`

### Option 2: Full Refresh

For a complete data refresh:

1. **Log into BoardGameArena** in Chrome
2. **Navigate to your game history**: `https://boardgamearena.com/gamestats?player=YOUR_PLAYER_ID`
3. **Click "See more"** repeatedly until "No more data" appears
4. **Download the page** to `bga-data-download/`
5. **Ask Claude** to regenerate the entire `playHistory` array

## Parsing Details

The HTML contains game entries with this structure:
- Game name in `<a class="gamename">`
- Date/time like `01/18/2026 at 14:30`
- Placement in `<div class="rank">1st</div>` (1st = win)

Python regex used for parsing:
```python
pattern = r'gamename">([^<]+)</a>.*?(\d{2}/\d{2}/\d{4}) at (\d{2}:\d{2}).*?<div class="rank">(\w+)</div><div class="name"><a[^>]+>jg_machine</a>'
```

## Current Data Range

As of last update: **October 11, 2025 - January 18, 2026**
- 199 games across 100 unique days
- Most recent date in data: Check `playHistory[0].date` in `bga-stats.json`

## Tips

- The heatmap shows the last 12 months, so older data beyond that won't be visible
- Win rate colors: Green (≥50% wins), Blue (<50% wins)
- Intensity increases with more games per day (1, 2-3, 4-6, 7+ games)
