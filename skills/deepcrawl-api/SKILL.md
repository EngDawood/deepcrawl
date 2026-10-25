---
name: deepcrawl-api
description: Call the deployed deepcrawl API to read a URL as markdown, extract a page's links, or fetch activity logs. Use when the user wants a web page's content or link tree fetched through this worker, or needs a bearer JWT minted for it.
---

# Deepcrawl API

Base URL: `https://deepcrawl-api-worker.dawod.workers.dev`

Every path, `/docs` and `/openapi` included, returns 401 without a bearer token. The worker runs `AUTH_MODE=jwt`.

## Token

Tokens are HS256 JWTs with `sub`, `iat`, `exp`, signed with the worker's `JWT_SECRET`. Mint one:

```bash
JWT_SECRET=... node skills/deepcrawl-api/scripts/mint-jwt.mjs
```

Ask the user for the secret. It lives only in Cloudflare, so an unset `JWT_SECRET` is the signal to ask.

## Endpoints

| Call | Returns |
| --- | --- |
| `GET /read?url=example.com` | page markdown as `text/markdown` |
| `POST /read` | full result object; body `{"url": "...", ...options}` |
| `GET /links?url=example.com` | links for the page |
| `POST /links` | links tree; body `{"url": "...", ...options}` |
| `POST /logs`, `GET /logs`, `GET /logs/export` | activity logs |

```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/read?url=example.com"
```

## MCP

`/mcp` serves the same two operations as MCP tools, `read_url` and `extract_links` (Streamable HTTP, stateless, same bearer token). `.mcp.json` registers it from `DEEPCRAWL_TOKEN`. Tokens expire (default 1 hour); pass a TTL in seconds as the second argument to `mint-jwt.mjs` for a longer one.

## Options

Option names and defaults live in `worker/openapi_orpc.yaml` (18k lines). Grep for the schema (`ReadOptions`, the links options) instead of reading the file whole.

Done when the response is 200 with the requested content. A 401 means the token or secret is wrong, and a 429 means rate limited.
