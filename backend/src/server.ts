import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config, hasUpstream, validateProductionConfig } from './config.js';
import { pqc } from './crypto/pqc.js';
import { solanaVerifier } from './payments/solana.js';
import { getDb } from './store/db.js';
import { priceFor } from './catalogue.js';
import { handleChatCompletions } from './routes/chat.js';
import { handleListModels } from './routes/models.js';
import { handleGetReceipt, handleVerifyReceipt, handleReceiptStats } from './routes/receipts.js';
import { handleCreatePrepaidKey, handleGetBalance, handleGetKeyBalance, handleTopUpKey } from './routes/keys.js';
import { handlePreparePayment } from './routes/payments.js';
import { handleGetQuantumKeys } from './routes/quantum.js';
import { handleMcpRequest } from './mcp/mcpServer.js';

const VERSION = '1.1.0';
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

app.use(
  cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'PAYMENT-SIGNATURE',
      'X-Payment-Signature',
      'X-Payment-Reference',
      'X-Dev-Bypass',
      'X-QSeal-Encrypted',
      'X-QSeal-Kem',
      'Mcp-Session-Id',
    ],
    exposedHeaders: [
      'PAYMENT-REQUIRED',
      'PAYMENT-RESPONSE',
      'X-Payment-Required',
      'X-402-Version',
      'X-402-Network',
      'X-402-Token',
      'X-402-Recipient',
      'X-402-PayTo-ATA',
      'X-402-Amount',
      'X-402-Reference',
      'X-402-Pay-Url',
      'X-QSeal-Receipt-Id',
      'X-QSeal-Receipt-Signature',
      'X-QSeal-Receipt-Ed25519',
      'X-QSeal-PQC-Algorithm',
      'X-QSeal-Prompt-Hash',
      'X-QSeal-Response-Hash',
      'X-QSeal-Sealed',
    ],
  }),
);

app.use(express.json({ limit: '10mb' }));

/**
 * Zero-logging policy: method, path and status only. Never bodies, prompts
 * or completions. Secrets that may appear in paths are redacted.
 */
const redact = (p: string) => p.replace(/qseal_sk_[A-Za-z0-9_]+/g, 'qseal_sk_[redacted]');
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[QSeal Gateway] ${new Date().toISOString()} ${req.method} ${redact(req.path)} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// Fixed-window rate limiting per client IP (set TRUST_PROXY behind a load balancer).
const ipRateMap = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [ip, r] of ipRateMap) if (now > r.resetAt) ipRateMap.delete(ip);
}, 60_000).unref();

const rateLimit = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let record = ipRateMap.get(ip);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + config.rateLimitWindowMs };
    ipRateMap.set(ip, record);
  }
  record.count++;
  if (record.count > config.rateLimitMax) {
    res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));
    return res.status(429).json({ error: { message: 'Rate limit exceeded. Please wait before sending more requests.', type: 'rate_limit_error' } });
  }
  next();
};

const api = express.Router();
api.use(rateLimit);

// OpenAI-compatible
api.post('/v1/chat/completions', handleChatCompletions);
api.get('/v1/models', handleListModels);

// Receipts
api.get('/v1/receipts/stats', handleReceiptStats);
api.get('/v1/receipts/:id', handleGetReceipt);
api.post('/v1/receipts/verify', handleVerifyReceipt);

// Prepaid keys and payments
api.post('/v1/keys/prepaid', handleCreatePrepaidKey);
api.post('/v1/keys/topup', handleTopUpKey);
api.get('/v1/keys/balance', handleGetBalance);
api.get('/v1/keys/:key/balance', handleGetKeyBalance);
api.post('/v1/payments/prepare', handlePreparePayment);

// Public verification keys
api.get('/v1/quantum-keys', handleGetQuantumKeys);
api.get('/.well-known/qseal-keys.json', handleGetQuantumKeys);

// MCP (JSON-RPC over HTTP)
api.post('/mcp', handleMcpRequest);

api.get('/health', (_req: Request, res: Response) => {
  const keys = pqc.getPublicKeys();
  res.status(200).json({
    status: 'healthy',
    service: 'QSeal Gateway',
    version: VERSION,
    mode: config.allowDevBypass ? 'development' : 'production',
    solana: {
      network: config.solanaNetwork,
      caip2: config.caip2Network,
      wallet_chain: config.walletChain,
      payTo: config.payTo,
      payToAta: solanaVerifier.getPayToAta(),
      usdc_mint: config.usdcMint,
      price_per_request_usdc: priceFor(config.defaultModel),
      min_prepaid_deposit_usdc: config.minPrepaidDepositUsdc,
    },
    pqc: {
      algorithms: 'NIST ML-KEM-768 + NIST ML-DSA-65 + Ed25519',
      ml_kem_pubkey_hash: keys.mlKemPublicKey.slice(0, 16) + '...',
      ml_dsa_pubkey_hash: keys.mlDsaPublicKey.slice(0, 16) + '...',
      verification_url: '/.well-known/qseal-keys.json',
    },
    upstream: {
      provider: hasUpstream() ? config.upstreamProvider : config.allowDevBypass ? 'dev-engine' : 'none',
      active: hasUpstream(),
    },
    policies: {
      zero_prompt_retention: true,
      sealed_prompts_supported: true,
      verifiable_signed_receipts: true,
      official_x402_v2: true,
    },
  });
});

const info = {
  name: 'QSeal Gateway',
  tagline: 'Private AI for Solana agents. Quantum-resistant receipts. Pay with USDC.',
  version: VERSION,
  endpoints: {
    completions: 'POST /v1/chat/completions',
    models: 'GET /v1/models',
    quantum_keys: 'GET /v1/quantum-keys',
    well_known_keys: 'GET /.well-known/qseal-keys.json',
    prepaid_keys: 'POST /v1/keys/prepaid',
    topup: 'POST /v1/keys/topup',
    balance: 'GET /v1/keys/balance',
    prepare_payment: 'POST /v1/payments/prepare',
    receipts: 'GET /v1/receipts/:id',
    verify_receipt: 'POST /v1/receipts/verify',
    mcp: 'POST /mcp',
    health: 'GET /health',
  },
};
api.get('/v1', (_req, res) => res.json(info));

app.use(api);

// Optional: serve the built web app from the same origin.
const frontend = config.serveFrontendDir;
if (frontend && fs.existsSync(path.join(frontend, 'index.html'))) {
  app.use(express.static(frontend, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!v1\/|v1$|mcp$|health$|\.well-known\/).*/, (req, res, next) => {
    if (!req.accepts('html')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(frontend, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => res.json(info));
}

// JSON 404 and error responses (never echo request content).
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { message: 'Not found', type: 'not_found' } });
});
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Request body is not valid JSON', type: 'invalid_request_error' } });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Request body is too large', type: 'invalid_request_error' } });
  }
  console.error(`[QSeal Gateway] Unhandled error: ${err?.name || 'Error'}`);
  return res.status(500).json({ error: { message: 'Internal gateway error', type: 'api_error' } });
});

export function startServer(port = config.port) {
  const problems = validateProductionConfig();
  if (problems.length) {
    console.error('\n[QSeal Gateway] Refusing to start in production:\n' + problems.map((p) => `  - ${p}`).join('\n') + '\n');
    process.exit(1);
  }
  getDb(); // open (and migrate) the database before accepting traffic

  const server = app.listen(port, config.host, () => {
    console.log(`\n======================================================`);
    console.log(`QSeal Gateway ${VERSION} on http://${config.host}:${port} (${config.allowDevBypass ? 'DEVELOPMENT' : 'production'} mode)`);
    console.log(`Solana: ${config.solanaNetwork} (${config.caip2Network}) payTo ${config.payTo}`);
    console.log(`Model provider: ${hasUpstream() ? config.upstreamProvider : config.allowDevBypass ? 'dev engine (not a model)' : 'NONE'}`);
    console.log(`Database: ${config.databasePath}`);
    if (frontend) console.log(`Serving web app from ${frontend}`);
    if (config.allowDevBypass) console.log('WARNING: dev bypass is ON. Free requests are possible. Never use this in production.');
    console.log(`======================================================\n`);
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return server;
}

const isMainModule =
  process.argv[1]?.replace(/\\/g, '/').endsWith('src/server.ts') || process.argv[1]?.replace(/\\/g, '/').endsWith('dist/server.js');

if (isMainModule && process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
