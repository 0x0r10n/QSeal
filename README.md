# QSeal Gateway 🔒⚛️

> **Quantum-secure private AI inference for Solana agents.**  
> *“Private AI for Solana agents. Prompts stay sealed. Quantum-resistant. Pay with USDC.”*

---

## ⚡ Core Architecture & Promises

- **OpenAI-Compatible**: Drop-in replacement for OpenAI API (`POST /v1/chat/completions`, `GET /v1/models`).
- **Official Solana x402 V2 Protocol**: Unpaid requests return official `PAYMENT-REQUIRED` headers containing CAIP-2 network identifiers (`solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` for Devnet, `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` for Mainnet). Clients using `@x402/svm` or `@x402/fetch` pay and retry seamlessly.
- **On-Chain Solana USDC Settlement**: Checks on-chain transactions, ATA (Associated Token Account) transfers, exact amounts, and enforces anti-replay protection.
- **Live Model Routing**: Plugs directly into Groq, OpenRouter, Together, or Fireworks (via `GROQ_API_KEY`, `OPENROUTER_API_KEY`, etc.), mapping privacy models (`qseal-quantum-70b`, `qseal-deepseek-r1`) to real fast inference with dynamic model pricing.
- **Zero Prompt Retention**: Enforced zero-logging middleware. Prompts and completions are held strictly in ephemeral RAM and never recorded to disk, database, or console.
- **NIST Post-Quantum Cryptography**: 
  - **ML-KEM-768** (FIPS 203 / Kyber): Asymmetric key encapsulation for client-side prompt sealing.
  - **ML-DSA-65** (FIPS 204 / Dilithium): Cryptographically signed inference receipts.
- **Stable Verification Key**: Published at `GET /.well-known/qseal-keys.json` and persisted in `.qseal_keys.json`.

---

## 🚀 Quick Setup & Launch

### 1. Install & Build
```bash
cd backend
npm install
npm run build
```

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

# Developer Testing
ALLOW_DEV_BYPASS=true
```

### 3. Start Gateway
```bash
npm start
```

---

## 💳 Official Solana x402 V2 Client Integration

Clients using the official `@x402/fetch` and `@x402/svm` packages can call QSeal with zero custom payment code:

```typescript
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm";
import { createKeyPairSignerFromBytes } from "@solana/kit";

// 1. Initialize Solana agent signer
const signer = await createKeyPairSignerFromBytes(agentPrivateKeyBytes);

// 2. Wrap standard fetch with SVM payment scheme
const x402Fetch = wrapFetchWithPayment(fetch, [new ExactSvmScheme(signer)]);

// 3. Make completion call: automatically intercepts HTTP 402,
// broadcasts the 0.001 USDC transfer, attaches PAYMENT-SIGNATURE, and resolves!
const response = await x402Fetch("http://localhost:4020/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "qseal-quantum-70b",
    messages: [{ role: "user", content: "Execute confidential on-chain arbitrage" }],
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);
console.log("ML-DSA-65 Receipt:", data.qseal_receipt);
```

---

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
  -H "PAYMENT-SIGNATURE: <base64_encoded_payment_payload_or_tx_signature>" \
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

Run the full production test suite:
```bash
npm test
```
Verifies:
1. Health & CAIP-2 network reporting
2. OpenAI-compatible models listing with pricing
3. Official x402 V2 `PAYMENT-REQUIRED` headers
4. `PAYMENT-SIGNATURE` transaction submission & `PAYMENT-RESPONSE` settlement
5. Anti-replay prevention
6. Stable keys at `/.well-known/qseal-keys.json`
7. ML-DSA-65 post-quantum receipt verification
8. In-memory ML-KEM-768 prompt sealing & decapsulation
9. Prepaid API key quotas
10. MCP tool execution
