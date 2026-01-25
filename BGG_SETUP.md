# BoardGameGeek Integration

This project integrates BoardGameGeek (BGG) data directly into your Astro site without requiring an API key.

## How It Works

The BGG integration uses their **public XML API** to fetch user data at build time:

- **`src/lib/bgg.ts`** - Utility functions to fetch and parse BGG data
- **`src/pages/play/index.astro`** - Demo page showing your play stats

## Setup

### 1. Update Your BGG Username

In [src/pages/play/index.astro](src/pages/play/index.astro), change the username:

```astro
let stats = await fetchBGGPlays("YOUR_USERNAME_HERE");
let collection = await fetchBGGCollection("YOUR_USERNAME_HERE");
```

### 2. Make Your Profile Public

Ensure your BoardGameGeek profile is **public** so the API can access it:
1. Go to [BoardGameGeek.com](https://boardgamegeek.com)
2. Login to your account
3. Go to Account Settings → Privacy
4. Make sure your profile and collection are public

### 3. Build

```bash
npm run build
```

The page will fetch your actual data during the build process.

## API Endpoints

- **Plays**: `https://boardgamegeek.com/xmlapi/plays.xml?username={username}`
- **Collection**: `https://boardgamegeek.com/xmlapi/collection.xml?username={username}`

No authentication required!

## Available Data

The `fetchBGGPlays()` function returns:

```typescript
{
  totalGames: number;        // Unique games you've played
  totalPlays: number;        // Total play count
  uniqueGames: number;       // Same as totalGames
  mostRecentPlay: string;    // Date of last recorded play
  favoriteGames: Array<{
    name: string;            // Game name
    rating: number;          // Not currently populated
    plays: number;           // Play count for this game
  }>;
}
```

## Extending It

You can:
- **Add more stats** - Track winning percentages, play duration, etc.
- **Create game-specific pages** - Link to individual game reviews
- **Add player data** - Show who you play with most
- **Compare collections** - Show overlap with other players
- **Build charts** - Visualize play history over time

## Demo Data

If the API call fails or you haven't set up your profile yet, the page falls back to demo data so your site still works during development.

## Troubleshooting

**404 errors during build?**
- Check that your username is correct
- Verify your BGG profile is set to public
- Wait a moment and rebuild (BGG API can be slow)

**No data showing?**
- Open your browser console to see error messages
- Check the build logs for "BGG API error" messages
- Try accessing your profile directly: `https://boardgamegeek.com/user/{username}`

**Want to add more endpoints?**
The BGG XML API also provides:
- **User info**: `xmlapi/user.xml?name={username}`
- **Game data**: `xmlapi/boardgame.xml?id={id}`
- **Search**: `xmlapi/search.xml?search={query}`

See [BGG API Documentation](https://boardgamegeek.com/wiki/page/BGG_XML_API2) for more details.
