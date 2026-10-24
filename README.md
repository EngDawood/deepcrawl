# deepcrawl worker

Self-hosted [Deepcrawl](https://github.com/lumpinif/deepcrawl) API worker (`apps/workers/v0`) with the packages it needs to build. Deployed to Cloudflare Workers in `jwt` auth mode.

## Layout

- `apps/workers/v0`: the worker. Config is in `wrangler.jsonc` (D1 `DB_V0`, two KV namespaces, `AUTH_MODE=jwt`).
- `packages/*`: shared workspace packages the worker imports.

## Usage

```bash
pnpm install
pnpm typecheck
pnpm build     # dry-run bundle to apps/workers/v0/dist
pnpm migrate   # apply D1 migrations (needs CLOUDFLARE_API_TOKEN)
pnpm deploy
```

`JWT_SECRET` is a Wrangler secret and is not stored in this repo:

```bash
cd apps/workers/v0 && pnpm exec wrangler secret put JWT_SECRET
```

Clients send `Authorization: Bearer <token>`, an HS256 JWT signed with that secret and carrying `sub`, `iat` and `exp`.

Upstream project: MIT licensed, see `LICENSE`.
