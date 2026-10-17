# QSeal Gateway 🔒⚛️

> **Quantum-secure private AI inference for Solana agents.**  
> *“Private AI for Solana agents. Prompts stay sealed. Quantum-resistant. Pay with USDC.”*

---

## What it does

- **OpenAI-compatible**: `POST /v1/chat/completions`, `GET /v1/models`. Responses add a `qseal_receipt` field.
- **x402 V2 payments on Solana**: unpaid requests get `402` with a `PAYMENT-REQUIRED` challenge (CAIP-2 network, USDC mint, treasury, reference). Payments are verified on-chain, must be recent (`MAX_PAYMENT_AGE_SEC`), and can be used once, even across restarts.
- **Prepaid keys**: bought with a verified USDC deposit (`POST /v1/keys/prepaid`), topped up the same way, stored only as SHA-256 hashes. Balance via `GET /v1/keys/balance` with `Authorization: Bearer`.
- **Sealed prompts**: clients may encrypt requests to the gateway with ML-KEM-768 (FIPS 203) + AES-256-GCM. The gateway decrypts in memory and forwards the prompt to the model provider.
- **Signed receipts**: ML-DSA-65 (FIPS 204) + Ed25519 over hashes of prompt and response, model, tokens and payment. Verification checks the signatures against the gateway's published keys (`/.well-known/qseal-keys.json`).
- **Zero prompt retention at the gateway**: no prompt or completion is stored or logged. Model providers handle prompts under their own policies.
- **Model routing**: each QSeal model maps to a named upstream model per provider (`src/catalogue.ts`); `GET /v1/models` shows which. Provider failures are errors, never canned answers, and the charge is refunded.
- **MCP**: `POST /mcp` with `qseal_infer` (paid like chat) and `qseal_verify_receipt`.
- **Persistence**: SQLite via Node's built-in `node:sqlite` (Node 22.13+). No native dependencies.

## 🚀 Quick Setup & Launch

### 1. Install & Build
```bash
cd backend
npm install
npm run build
```

For local development, `npm run dev` starts the gateway with `ALLOW_DEV_BYPASS=true`: free test keys (`POST /v1/keys/prepaid {"dev": true}`), simulated payments (`sim_tx_…`), and a clearly labelled echo engine when no provider is set. Production refuses to start with it enabled.

### 2. Configure Environment (`.env`)
Create a `.env` file in `qseal/backend`:
```ini
PORT=4020
HOST=0.0.0.0

# Solana Network Configuration
SOLANA_NETWORK=devnet # or mainnet-beta
SOLANA_RPC_URL=https://api.devnet.solana.com # or your Alchemy/Helius RPC URL

# Recipient Address for USDC Payments
# Set to your Solana wallet address or your USDC Associated Token Account (ATA)
SOLANA_PAY_TO=YourSolanaWalletAddressHere11111111111111111

# Pricing
PRICE_PER_REQUEST_USDC=0.001

# Live Model Provider (Choose one or set UPSTREAM_API_KEY)
GROQ_API_KEY=gsk_...
# OPENROUTER_API_KEY=sk-or-...
# TOGETHER_API_KEY=...

# Never true in production
ALLOW_DEV_BYPASS=false
```

See `.env.example` for every option (persistence paths, CORS, proxy, pricing, custom providers).

### 3. Start Gateway
```bash
npm start
```

---

## 💳 Paying from code

Three ways, all tested:

1. **Prepaid key** (simplest for agents): use it as the API key with any OpenAI SDK.
   ```ts
   const qseal = new OpenAI({ baseURL: `${QSEAL_API_URL}/v1`, apiKey: "qseal_sk_…" })
   ```
2. **Pay per request**: send a USDC transfer to the treasury, then retry with its transaction signature (below).
3. **Browser wallets**: `POST /v1/payments/prepare` returns an unsigned USDC transfer for the wallet to sign and send; the web app does this.

> The gateway accepts the signature of a transfer that is already on-chain. Clients that instead hand over a signed-but-unsent transaction for the server to submit (as some x402 SVM client libraries do) are not supported yet.

## 💳 Standard HTTP / cURL Flow

### Step 1: Unpaid Request
```bash
curl -i -X POST http://localhost:4020/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello QSeal"}]}'
```

**Response (HTTP 402 Payment Required):**
```http
HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: eyJ4NDAyVmVyc2lvbiI6MiwiYWNjZXB0cyI6W3sic2NoZW1lIjoiZXhhY3QiLCJwcmljZSI6IiQwLjAwMTAiLCJuZXR3b3JrIjoic29sYW5hOkV0V1RSQUJaYVlxNmlNZmVZS291UnUxNjZWVTIxcWExIiwicGF5VG8iOiJRU2VhTDExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTEiLCJhc3NldCI6IjR6TU1DOXNydDVSaTVYMTRHQWdYaGFIaWkzR25QQUVFUllQZ1pKRG5jRFUiLCJleHRyYSI6eyJyZWZlcmVuY2UiOiI2VkQzLi4uIn19XX0=
X-Payment-Required: true
X-402-Pay-Url: solana:QSeaL...?amount=0.0010&spl-token=...&reference=6VD3...
```

### Step 2: Pay & Retry with PAYMENT-SIGNATURE
```bash
curl -X POST http://localhost:4020/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "PAYMENT-SIGNATURE: <tx signature, or base64 JSON {\"signature\": ..., \"reference\": ...}>" \
  -d '{"messages":[{"role":"user","content":"Hello QSeal"}]}'
```

---

## 🔑 Stable Receipt Verification Key

QSeal generates and persists stable cryptographic keys on startup in `.qseal_keys.json`.

- Public verification endpoint: `GET /.well-known/qseal-keys.json` or `GET /v1/quantum-keys`
- Verify any receipt ID:
  ```bash
  curl -X POST http://localhost:4020/v1/receipts/verify \
    -H "Content-Type: application/json" \
    -d '{"receipt_id": "rcpt_6f8dcd7b537046c4be2eb8b872faab69"}'
  ```

---

## 🧪 Automated Test Suite

```bash
npm test
```

28 tests covering: health and models; x402 challenge, payment and replay (including after a restart); refunds when the provider fails; prepaid keys (no free minting, deduction, balance by header); receipts (genuine, tampered, signed with foreign keys); sealed requests and sealed responses; MCP payment enforcement; log redaction; JSON errors; production config checks; and on-chain USDC verification (amount, mint, recipient, age, failed transactions) against a stubbed RPC.
