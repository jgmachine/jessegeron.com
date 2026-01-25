# BGG Data Fetch Error Log

## Summary
The pre-build BGG data fetch script (`scripts/fetch-bgg.js`) is encountering **HTTP 401 Unauthorized** responses from the BoardGameGeek API, preventing real data from being fetched.

## Error Details

### 1. API Response Status
All requests to BGG xmlapi2 endpoints return **401 Unauthorized**:
- HTTP/2 401
- Server: nginx
- Content-Type: text/html; charset=UTF-8
- WWW-Authenticate: Bearer realm="xml api"

### 2. Current Behavior
```
[fetch] requesting https://boardgamegeek.com/xmlapi2/collection?username=jgmachine&own=1&stats=1
[fetch] Unexpected status 401 for https://boardgamegeek.com/xmlapi2/collection?username=jgmachine&own=1&stats=1
[fetch] requesting https://boardgamegeek.com/xmlapi2/plays?username=jgmachine&pagesize=100
[fetch] Unexpected status 401 for https://boardgamegeek.com/xmlapi2/plays?username=jgmachine&pagesize=100
[out] wrote /Users/jessegeron/VS Code/jessegeron.com/public/bgg-data.json
```

The script gracefully handles 401 responses by caching the failed response and continues, but this means `public/bgg-data.json` contains only error statuses:

```json
{
  "fetchedAt": "2026-01-25T01:56:48.747Z",
  "username": "jgmachine",
  "collection": {
    "status": 401,
    "body": ""
  },
  "plays": {
    "status": 401,
    "body": ""
  },
  "things": {}
}
```

### 3. Full HTTP Response Headers
```
HTTP/2 401 
server: nginx
date: Sun, 25 Jan 2026 02:41:16 GMT
content-type: text/html; charset=UTF-8
access-control-allow-origin: *
www-authenticate: Bearer realm="xml api"
access-control-expose-headers: WWW-Authenticate
via: 1.1 google
content-length: 0
alt-svc: h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
```

## Diagnosis
The BGG API is returning `WWW-Authenticate: Bearer realm="xml api"`, which indicates the API may be implementing bearer token authentication. The public endpoints should work without authentication, but the API is blocking requests.

### Possible Causes:
1. **Authentication Required**: BGG may have changed the API to require authentication (bearer token/API key) even for public profiles
2. **User-Agent Blocking**: Some APIs block requests without proper User-Agent headers or block bots/scripts
3. **Rate Limiting/IP Blocking**: The server may be rate-limiting or blocking requests from this environment/IP
4. **API Endpoint Changes**: BGG may have deprecated or modified the xmlapi2 endpoints

## Endpoints Tested
- `https://boardgamegeek.com/xmlapi2/collection?username=jgmachine&own=1&stats=1` → 401
- `https://boardgamegeek.com/xmlapi2/plays?username=jgmachine&pagesize=100` → 401

## Web Browser vs Node.js
**Note**: These same URLs work in a web browser (return valid XML), but return 401 when requested via Node.js fetch. This suggests the issue is related to request headers, user-agent, or server-side request detection.

## Files Affected
- `scripts/fetch-bgg.js` - Pre-build fetch script with polling/caching logic
- `public/bgg-data.json` - Output file containing only error responses
- `src/pages/play/index.astro` - Reads from `public/bgg-data.json` and falls back to demo data

## Current Workaround
The `/play` page displays demo/placeholder data because the real data cannot be fetched. The system is designed to gracefully degrade to demo data when API fetch fails.

## Next Steps for Troubleshooting
1. Add custom User-Agent headers to fetch requests
2. Add authentication headers if API key is available
3. Test with `curl` from the same environment to confirm server-side behavior
4. Check BGG documentation for authentication requirements
5. Consider client-side fetch approach (if Astro supports it) where browser user-agent doesn't trigger blocking
6. Review BGG rate limiting and IP blocking policies
