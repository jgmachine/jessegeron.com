import fs from 'fs';
import { parseStringPromise } from 'xml2js';

async function analyze() {
  const xml = fs.readFileSync('public/data/bgg-plays.xml', 'utf-8');
  const data = await parseStringPromise(xml);
  const plays = data.plays.play || [];

  const naGames = {};

  plays.forEach(play => {
    const gameName = play.item?.[0]?.$.name || 'Unknown';
    const players = play.players?.[0]?.player || [];
    const hasPlayerData = players.length > 0;

    if (!hasPlayerData) {
      if (!naGames[gameName]) {
        naGames[gameName] = { count: 0, dates: [] };
      }
      naGames[gameName].count++;
      naGames[gameName].dates.push(play.$.date);
    }
  });

  // Sort by count descending
  const sorted = Object.entries(naGames)
    .sort((a, b) => b[1].count - a[1].count);

  console.log('Games with N/A (no winner tracked):');
  console.log('===================================');
  sorted.forEach(([name, data]) => {
    console.log(`${name}: ${data.count} plays`);
  });
  console.log('');
  console.log('Total N/A plays:', sorted.reduce((sum, [_, d]) => sum + d.count, 0));
}

analyze();
