---
name: deepcrawl-api
description: Call the deployed deepcrawl API to read a URL as markdown, extract a page's links, or fetch activity logs. Use when the user wants a web page's content or link tree fetched through this worker, or needs a bearer JWT minted for it.
---

# Deepcrawl API

Base URL: `https://deepcrawl.dawod.workers.dev`

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

`/mcp` serves the API as MCP tools (Streamable HTTP, stateless, same bearer token): `deepcrawl_read_url`, `deepcrawl_extract_links`, `deepcrawl_list_logs`, `deepcrawl_get_log`, `deepcrawl_export_log_response`. The log tools return nothing unless `ENABLE_ACTIVITY_LOGS` is true on the worker. `.mcp.json` registers it from `DEEPCRAWL_TOKEN`. Tokens expire (default 1 hour); pass a TTL in seconds as the second argument to `mint-jwt.mjs` for a longer one.

### Tool options

`deepcrawl_read_url` returns plain markdown by default. It also accepts the API's option names verbatim (camelCase, except `max_chars`):

- `markdownConverterOptions`: `preferNativeParser`, `keepDataImages`, `useInlineLinks`, `useLinkReferenceDefinitions`, `bulletMarker`, `codeBlockStyle`, `maxConsecutiveNewlines`.
- `markdown`, `rawHtml`, `cleanedHtml`, `robots`, `sitemapXML`, `metadata` (+ `metadataOptions` field switches). Setting any of these, or `markdown: false`, switches the result to a JSON object; each large string field is cut to `max_chars`.

`deepcrawl_extract_links` accepts `tree`, `treeOptions` (`folderFirst`, `linksOrder`, `extractedLinks`, `subdomainAsRootUrl`, `isPlatformUrl`), `linkExtractionOptions` (`includeExternal`, `includeMedia`, `excludePatterns`, `removeQueryParams`) and the same `metadata`, `metadataOptions`, `cleanedHtml`, `robots`, `sitemapXML` toggles. These schemas are reused from `packages/types` (`worker/src/mcp/options.ts`), so they track the HTTP API.

claude.ai connectors cannot send a static header, so the worker also runs a small OAuth server (`worker/src/oauth/oauth.ts`): add the connector with just the `/mcp` URL, and approve the consent page with `MCP_OAUTH_PASSWORD`. It issues the same JWTs (1 hour access, 30 day refresh) and only allows claude.ai/claude.com and loopback callbacks.

## Options

Option names and defaults live in `worker/openapi_orpc.yaml` (18k lines). Grep for the schema (`ReadOptions`, the links options) instead of reading the file whole.

The hosted API at `https://api.deepcrawl.dev` exposes the same 7 endpoints and schemas, but takes `dc_...` API keys from the dashboard; this worker takes only JWTs and OAuth.

Done when the response is 200 with the requested content. A 401 means the token or secret is wrong, and a 429 means rate limited.
