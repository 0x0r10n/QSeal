# QSeal

Private, verifiable AI inference for developers and AI agents: an OpenAI-compatible gateway that can seal prompts with ML-KEM-768, signs every answer with ML-DSA-65 + Ed25519, and takes payment in USDC on Solana (x402 or prepaid keys).

This repository holds both halves:

| Path | What |
| --- | --- |
| `backend/` | The gateway: Express, Solana payment verification, post-quantum receipts, prepaid keys, MCP. See [backend/README.md](backend/README.md). |
| `/` (root) | The web app: marketing site (`/`, `/technology`, `/security`, `/docs`, `/sign-in`) and the app (`/app/*`). React 19, TypeScript, Vite, Tailwind v4, Motion, React Three Fiber. |

## Run it locally

```bash
npm install && npm --prefix backend install

# Terminal 1: gateway in development mode (free test keys, simulated payments,
# a labelled echo engine when no model provider is set)
npm run dev:gateway                    # http://localhost:4020

# Terminal 2: web app pointed at it
VITE_QSEAL_API_URL=http://localhost:4020 npm run dev    # http://localhost:5173
```

In the app, open **Prepaid Keys → Create a test key**, then **New Request**. Add `GROQ_API_KEY` (or another provider) to `backend/.env` for real model output.

## Tests

| Command | Covers |
| --- | --- |
| `npm run test:backend` | 28 gateway tests: payments, replay protection, refunds, receipts (genuine, tampered, forged), sealing, MCP, persistence, log redaction, production config checks, on-chain verification against a stubbed RPC |
| `npm test` | Web unit tests, including browser crypto checked byte-for-byte against the gateway implementation |
| `npm run test:e2e` | Playwright on desktop and mobile, plus live journeys against a real development gateway (key purchase, sealed request, receipt verification, wallet pay-per-request) |
| `npm run test:all` | Lint, types, and all of the above |

## Deploy

One image runs the gateway and serves the web app from the same origin:

```bash
docker build -t qseal .
docker run -p 8080:8080 -v qseal-data:/data --env-file backend/.env qseal
```

`/data` holds the SQLite database (balances, receipts, spent payments) and the signing keys. **It must be persistent.** On hosts without a persistent disk, put the keys in `QSEAL_KEYS_JSON` and use a mounted volume for the database.

To host the web app separately (static hosting or a CDN), build it with `VITE_QSEAL_API_URL=https://your-gateway` and set `CORS_ORIGINS` on the gateway to the app's origin.

## Launch checklist

The gateway refuses to start with `NODE_ENV=production` unless the first four are set.

- [ ] `SOLANA_PAY_TO`: your treasury wallet. Make sure its USDC token account exists.
- [ ] A model provider: `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `TOGETHER_API_KEY`, `FIREWORKS_API_KEY`, or `UPSTREAM_BASE_URL` + `UPSTREAM_API_KEY` + `UPSTREAM_MODEL_MAP`.
- [ ] `SOLANA_RPC_URL`: a dedicated RPC (Helius, Triton, QuickNode…). The public endpoint is rate limited.
- [ ] `ALLOW_DEV_BYPASS` unset or `false`.
- [ ] `SOLANA_NETWORK=mainnet-beta` when you are ready for real USDC.
- [ ] A persistent volume for `/data`, and a backup of `qseal_keys.json`. Losing or rotating the signing keys invalidates every receipt issued before.
- [ ] HTTPS in front of the gateway, and `TRUST_PROXY=true` behind a load balancer so rate limits see real client IPs.
- [ ] `PRICE_PER_REQUEST_USDC` and `MIN_PREPAID_DEPOSIT_USDC` set to your pricing.
- [ ] Privacy policy and terms of service published, and linked from the site footer.
- [ ] A security contact for vulnerability reports.

## Security model in one paragraph

The gateway keeps no prompts or completions (receipts hold SHA-256 hashes; the access log records method, path and status, with secrets redacted). Sealing encrypts a request from the client to the gateway with ML-KEM-768 + AES-256-GCM. The gateway decrypts it in memory and forwards it to the configured model provider, which sees the prompt under its own data policy. Receipts are signed with ML-DSA-65 and Ed25519 and verify only against the gateway's published keys. Payments are USDC on Solana, verified on-chain, usable once, and refunded or released if inference fails. There is no TEE, no end-to-end encryption to the model, and wallet signatures are classical. The site's Security page says the same.

## Web app structure

```
src/
  app/            router, providers
  layouts/        MarketingLayout, AppLayout
  routes/         marketing/*, app/* (lazy-loaded)
  components/     brand (emblem), marketing, application, ui
  features/       request lifecycle (Sealing Chamber), local history
  services/
    api/          typed gateway client: chat, models, keys, payments, receipts
    crypto/       ML-KEM sealing, ML-DSA/Ed25519 receipt verification, base58
    wallet/       Wallet Standard connect + sign, pay-from-wallet
  content/        security layers, FAQ, code samples (all run against the gateway)
  lib/            emblem geometry, motion tokens, env, highlighter
```

Environment for the web app:

| Variable | Purpose |
| --- | --- |
| `VITE_QSEAL_API_URL` | Gateway URL, or `/` when the gateway serves the app. Empty = unconnected mode, no requests. |
| `VITE_QSEAL_API_TIMEOUT_MS` | Request timeout (default 120000). |
| `VITE_QSEAL_DEV_MOCKS` | `true` shows labelled sample data in dev builds only, without a gateway. |
| `VITE_ROUTER` | `hash` for static hosts without SPA fallback. |
