#!/usr/bin/env node
/*
 Pre-build script to fetch BoardGameGeek data with polling, throttling,
 exponential backoff, and on-disk caching.

 Usage:
  BGG_USERNAME=jgmachine node scripts/fetch-bgg.js

 Environment variables:
  BGG_USERNAME - required username
  BGG_CACHE_TTL - seconds to reuse cache (default 86400 = 24h)
  BGG_THROTTLE_MS - milliseconds between requests (default 1500)
  BGG_MAX_TOTAL_WAIT_MS - max total wait per URL for polling (default 60000)
*/

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { parseStringPromise } from 'xml2js';

const CACHE_TTL = parseInt(process.env.BGG_CACHE_TTL || '86400', 10) * 1000;
const THROTTLE_MS = parseInt(process.env.BGG_THROTTLE_MS || '1500', 10);
const MAX_TOTAL_WAIT_MS = parseInt(process.env.BGG_MAX_TOTAL_WAIT_MS || '60000', 10);

const CACHE_DIR = path.resolve('.cache', 'bgg');
const OUT_FILE = path.resolve('public', 'bgg-data.json');

const username = process.env.BGG_USERNAME;

// If username is not set, behave gracefully: if an existing output file is present,
// reuse it (skip fetching). If not present, write a minimal file and exit.
if (!username) {
  (async () => {
    try {
      await fs.access(OUT_FILE);
      console.log('BGG_USERNAME not set; existing output found, skipping fetch.');
      process.exit(0);
    } catch (err) {
      console.warn('BGG_USERNAME not set and no existing output found; writing placeholder output.');
      const out = { fetchedAt: new Date().toISOString(), username: null, collection: null, plays: null, things: {} };
      try {
        await ensureDir(path.dirname(OUT_FILE));
        await fs.writeFile(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');
        console.log('[out] wrote placeholder', OUT_FILE);
      } catch (e) {
        console.error('Failed to write placeholder output', e);
      }
      process.exit(0);
    }
  })();
}



function hashKey(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {}
}

async function readCacheForUrl(url) {
  const key = hashKey(url);
  const file = path.join(CACHE_DIR, key + '.json');
  try {
    const stat = await fs.stat(file);
    const age = Date.now() - stat.mtimeMs;
    if (age <= CACHE_TTL) {
      const raw = await fs.readFile(file, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {}
  return null;
}

async function writeCacheForUrl(url, data) {
  const key = hashKey(url);
  const file = path.join(CACHE_DIR, key + '.json');
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchWithPolling(url) {
  // Check cache first
  const cached = await readCacheForUrl(url);
  if (cached) {
    console.log(`[cache] using cached response for ${url}`);
    return cached;
  }

  console.log(`[fetch] requesting ${url}`);

  const start = Date.now();
  let attempt = 0;
  let wait = 1000; // start with 1s

  while (Date.now() - start < MAX_TOTAL_WAIT_MS) {
    attempt++;
    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      };
      
      if (attempt === 1) {
        console.log(`[headers] Sending on ${url}:`, JSON.stringify(headers, null, 2));
      }
      
      const res = await fetch(url, { headers });
      const status = res.status;
      const text = await res.text();

      if (status === 200) {
        try {
          const parsed = await parseStringPromise(text);
          await writeCacheForUrl(url, parsed);
          console.log(`[fetch] 200 OK - parsed and cached ${url}`);
          return parsed;
        } catch (err) {
          console.error('[fetch] Failed to parse XML for', url, err);
          await writeCacheForUrl(url, { raw: text });
          return { raw: text };
        }
      }

      if (status === 202) {
        console.log(`[fetch] 202 Accepted (queued) for ${url}. attempt=${attempt}. waiting ${wait}ms`);
        await sleep(wait);
        wait = Math.min(wait * 2, 20000);
        continue;
      }

      if (status === 429) {
        console.log(`[fetch] 429 Too Many Requests for ${url}. backing off ${wait}ms`);
        await sleep(wait);
        wait = Math.min(wait * 2, 30000);
        continue;
      }

      // other non-200
      console.warn(`[fetch] Unexpected status ${status} for ${url}`);
      return { status, body: text };
    } catch (err) {
      console.error('[fetch] request error for', url, err.message || err);
      await sleep(wait);
      wait = Math.min(wait * 2, 30000);
    }
  }

  console.warn(`[fetch] timed out waiting for ${url} after ${MAX_TOTAL_WAIT_MS}ms`);
  return null;
}

async function fetchCollection(username) {
  const url = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&own=1&stats=1`;
  return await fetchWithPolling(url);
}

async function fetchPlays(username) {
  const url = `https://boardgamegeek.com/xmlapi2/plays?username=${encodeURIComponent(username)}&pagesize=100`;
  return await fetchWithPolling(url);
}

async function fetchThing(id) {
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${encodeURIComponent(id)}&stats=1`;
  return await fetchWithPolling(url);
}

async function main() {
  await ensureDir(CACHE_DIR);
  await ensureDir(path.dirname(OUT_FILE));

  // If a fresh combined output already exists, reuse it
  try {
    const stat = await fs.stat(OUT_FILE);
    const age = Date.now() - stat.mtimeMs;
    if (age <= CACHE_TTL) {
      console.log('[out] recent output found, skipping fetch');
      return;
    }
  } catch (err) {}

  // Fetch collection and plays sequentially
  const collection = await fetchCollection(username);
  // throttle between endpoint fetches
  await sleep(THROTTLE_MS);
  const plays = await fetchPlays(username);

  // Extract thing ids from collection
  let ids = [];
  try {
    const items = collection?.items?.item || [];
    if (Array.isArray(items)) {
      items.forEach((it) => {
        const id = it.$?.objectid || it.$?.id || it.$?.objectid;
        if (id) ids.push(id);
      });
    }
  } catch (err) {}

  // Ensure unique ids
  ids = Array.from(new Set(ids)).slice(0, 200); // limit to 200 things to avoid long runs

  const things = {};
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    console.log(`[thing] fetching ${i + 1}/${ids.length} id=${id}`);
    const data = await fetchThing(id);
    if (data) things[id] = data;
    await sleep(THROTTLE_MS);
  }

  const out = {
    fetchedAt: new Date().toISOString(),
    username,
    collection: collection || null,
    plays: plays || null,
    things,
  };

  await fs.writeFile(OUT_FILE, JSON.stringify(out, null, 2), 'utf8');
  console.log('[out] wrote', OUT_FILE);
}

main().catch((err) => {
  console.error('Fatal error in fetch-bgg:', err);
  process.exit(1);
});
