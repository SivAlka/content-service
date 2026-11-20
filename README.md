# content-service

A small editorial content app: **Vue 3 + TypeScript** UI and an **Express + TypeScript** REST API.
Articles move through a review workflow (`draft → in_review → approved → scheduled/published → archived`),
keep a revision history, use optimistic concurrency, and can be scheduled for future publishing.

It is intentionally compact but non-trivial so it can be used as a base for **live coding / interview exercises**.
There is no auth, no database and no external services: everything runs locally and is open access.

```
content-service/
├── server/   Express API (TypeScript, zod, in-memory store, vitest + supertest)
└── web/      Vue 3 SPA (Vite, vue-router, vitest + @vue/test-utils)
```

## Prerequisites

- Node.js **20+** (22 recommended — see `.nvmrc`; `nvm use` if you have nvm)
- npm 10+

## Quick start

```bash
git clone https://github.com/SivAlka/content-service.git
cd content-service
npm install          # installs both workspaces

npm run dev          # API on :3001 + UI on :5173 (hot reload for both)
```

Open **http://localhost:5173**. The API is at http://localhost:3001/api (the Vite dev server proxies `/api`).

The server seeds ~32 sample articles on every start. State is in memory and resets on restart.

### Single-process / production-style

```bash
npm run build        # type-checks and builds web/dist and server/dist
npm start            # serves API + built UI together on http://localhost:3001
```

### Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | API (tsx watch) and UI (Vite) together |
| `npm test` | Runs server and web unit tests |
| `npm run typecheck` | `tsc` for the server, `vue-tsc` for the web app |
| `npm run build` | Production build of both |
| `npm run dev -w server` / `npm run dev -w web` | Run only one side |

### Configuration (all optional)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | API port |
| `SEED` | `true` | Set `false` to start with an empty store |
| `SCHEDULER_INTERVAL_MS` | `15000` | How often scheduled articles are checked for publishing |
| `VITE_API_TARGET` | `http://localhost:3001` | Where the Vite dev proxy sends `/api` |

## Domain overview

**Article** fields: `id, title, slug, body, tags[], brand, author, status, version, publishAt, publishedAt, createdAt, updatedAt`.

**Workflow** (see `server/src/workflow.ts`):

```
draft ──► in_review ──► approved ──► published ──► archived
  ▲           │            │  ▲          ▲            │
  └───────────┴────────────┘  └─ scheduled ┘          └──► draft
```

Guards: moving into `in_review`, `approved`, `scheduled` or `published` requires a body of ≥ 20 words and at least one tag.
`scheduled` additionally requires `publishAt`. A background scheduler publishes scheduled articles once `publishAt` has passed.

**Optimistic concurrency**: every mutation requires an `If-Match: "<version>"` header. A stale version returns `409 conflict`
(with the current article in `error.details.current`); a missing header returns `428`.

## API reference

Base URL: `http://localhost:3001/api`. Errors share one shape: `{ "error": { "code", "message", "details?" } }`.

| Method & path | Description |
| --- | --- |
| `GET /health` | Liveness |
| `GET /stats` | Counts by status/brand and top tags |
| `GET /articles` | List. Query: `q, status, brand, tag, sort (updatedAt\|createdAt\|title\|relevance), order, page, pageSize (≤100)` |
| `POST /articles` | Create `{ title, body?, tags?, brand, author }` → `201` |
| `GET /articles/:id` | Fetch one (returns `ETag`) |
| `PATCH /articles/:id` | Update `title/body/tags`. Requires `If-Match` |
| `POST /articles/:id/transitions` | `{ "to": "<status>", "publishAt"?: ISO-8601 }`. Requires `If-Match`. `409` illegal move, `422` guard failed |
| `GET /articles/:id/revisions` | Revision history, newest first |
| `POST /articles/:id/revisions/:n/restore` | Restore revision `n` as a new revision. Requires `If-Match` |

Example:

```bash
curl -s localhost:3001/api/articles?q=index\&pageSize=3 | jq '.items[].title'

curl -s -X POST localhost:3001/api/articles -H 'content-type: application/json' \
  -d '{"title":"My first post","brand":"demo","author":"Me","tags":["intro"]}'

curl -s -X PATCH localhost:3001/api/articles/<id> -H 'content-type: application/json' \
  -H 'If-Match: "1"' -d '{"title":"Renamed"}'
```

## Code map

| Area | Files |
| --- | --- |
| Routes, validation, error mapping | `server/src/app.ts`, `schemas.ts`, `errors.ts` |
| Domain logic / persistence | `server/src/store.ts`, `workflow.ts`, `search.ts`, `slug.ts` |
| Background job | `server/src/scheduler.ts` |
| API tests | `server/test/*.test.ts` |
| Views | `web/src/views/` (dashboard, list, editor) |
| API client | `web/src/api/client.ts` |
| Composables / components | `web/src/composables/`, `web/src/components/` |

## Troubleshooting

- **Port in use**: set `PORT=3002` and `VITE_API_TARGET=http://localhost:3002`.
- **Blank list / network errors in the UI**: make sure the API is running (`curl localhost:3001/api/health`).
- **Data disappeared**: the store is in memory by design; restart re-seeds it.
