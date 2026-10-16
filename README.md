# QSeal Web

Standalone frontend for **QSeal**, a quantum-resistant AI inference platform for developers and AI agents. It has two separate experiences:

- **Marketing site:** `/`, `/technology`, `/security`, `/docs`, `/sign-in`
- **Application workspace:** `/app`, `/app/new`, `/app/history`, `/app/verify`, `/app/models`, `/app/keys`, `/app/settings`

Stack: React 19 · TypeScript · Vite · Tailwind CSS v4 · Motion · React Three Fiber + Drei · TanStack Query · React Router.

## Getting started

```bash
npm install
cp .env.example .env.local   # set VITE_QSEAL_API_URL to connect a backend
npm run dev                  # http://localhost:5173
```

| Variable | Purpose |
| --- | --- |
| `VITE_QSEAL_API_URL` | Backend base URL. If empty, the app runs in a clearly labelled *unconfigured* mode and makes no requests. |
| `VITE_QSEAL_API_TIMEOUT_MS` | Request timeout (default 60000). |
| `VITE_QSEAL_DEV_MOCKS` | `true` turns on labelled sample data, **in dev builds only**. Production builds never reach the mock code. |

Never put secrets in `VITE_*` variables. They are embedded in the client bundle.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typecheck and production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Playwright journeys on desktop and mobile (builds and previews automatically) |
| `CAPTURE=1 npx playwright test screenshots` | Visual QA captures into `./screenshots` |
| `node scripts/capture-scroll.mjs <url> <out-prefix> <w> <h> <mobile 0/1>` | Viewport-by-viewport scroll captures of a running server |
| `npx vite-node scripts/favicon.ts` | Regenerate the favicon from the emblem geometry |

## Architecture

```
src/
  app/            router + providers (Query, MotionConfig)
  layouts/        MarketingLayout, AppLayout (separate shells)
  routes/         marketing/* and app/* pages (lazy-loaded)
  components/
    brand/        QEmblem (SVG mark), Wordmark
    marketing/    hero, 3D scene, landing sections
    application/  sidebar, top bar, panels, state views
    ui/           buttons, tags, code blocks, accordion, reveal
  features/       history store, request lifecycle (Sealing Chamber)
  services/       api/ (client, models, chat, errors, credentials, mocks), receipts
  content/        copy for security layers, FAQ, code samples
  lib/            emblem geometry, motion tokens, env, highlighter
```

### Emblem

`src/lib/emblem.ts` generates the fragmented Q deterministically: a ring of vertical chrome bars, heavier on the left, that dissolves into loose cubes across the upper right, closed by a tiled diagonal blade. The same geometry drives the SVG mark (`QEmblem`, with `full` and simplified `mark` detail levels), the favicon, and the instanced 3D sculpture in the hero.

The hero's WebGL scene is lazy-loaded after first paint, pauses when off-screen, and cross-fades over an SVG fallback. It is skipped when WebGL is unavailable or reduced motion is on.

### Backend integration boundary

All network access goes through `services/api/client.ts`, which handles timeouts, cancellation, error mapping (network/CORS, HTTP, parse) and the optional access key. Integrated contracts:

- `GET /v1/models`: parsed defensively (`{ data: [...] }` or a bare array)
- `POST /v1/chat/completions`: non-streaming; sends only `model` + `messages` plus any fields the user adds under *Advanced*

Not assumed, and left as explicit extension points until their contracts are supplied:

- **Receipts:** `services/receipts.ts` has `extractReceipt()` and a verifier registry. With no verifier registered, Verify reports *Unable to verify*, never *Valid*.
- **Auth:** an optional key is held in `sessionStorage` and sent as `Authorization: Bearer …` (`services/api/credentials.ts`). Adjust once the scheme is confirmed.
- **Solana wallet and payments, prepaid-key management, account history and usage:** the UI shows deliberate "not configured" states.

Request history is a local log in this browser (`features/history/store.ts`). It holds only requests actually sent from here.
