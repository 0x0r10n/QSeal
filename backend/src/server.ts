import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { pqc } from './crypto/pqc.js';
import { solanaVerifier } from './payments/solana.js';
import { handleChatCompletions } from './routes/chat.js';
import { handleListModels } from './routes/models.js';
import { handleGetReceipt, handleVerifyReceipt, handleReceiptStats } from './routes/receipts.js';
import { handleCreatePrepaidKey, handleGetKeyBalance } from './routes/keys.js';
import { handleGetQuantumKeys } from './routes/quantum.js';
import { handleMcpRequest } from './mcp/mcpServer.js';

const app = express();

// Enable CORS for web apps, agents, IDEs, and browser extensions
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'PAYMENT-SIGNATURE',
      'payment-signature',
      'PAYMENT-RESPONSE',
      'payment-response',
      'X-Payment-Signature',
      'X-Payment-Reference',
      'X-Dev-Bypass',
      'X-QSeal-Encrypted',
      'X-QSeal-Kem',
    ],
    exposedHeaders: [
      'PAYMENT-REQUIRED',
      'payment-required',
      'PAYMENT-RESPONSE',
      'payment-response',
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
  })
);

app.use(express.json({ limit: '10mb' }));

/**
 * STRICT ZERO-LOGGING POLICY MIDDLEWARE
 * We log ONLY method, route, and status. NEVER request bodies, prompts, or LLM outputs.
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Safe metadata only - zero prompt logging
    console.log(
      `[QSeal Gateway] ${new Date().toISOString()} ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`
    );
  });
  next();
});

// Basic sliding window rate limiting
const ipRateMap = new Map<string, { count: number; resetAt: number }>();
app.use((req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let record = ipRateMap.get(ip);

  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + config.rateLimitWindowMs };
    ipRateMap.set(ip, record);
  } else {
    record.count++;
  }

  if (record.count > config.rateLimitMax) {
    return res.status(429).json({
      error: {
        message: 'Rate limit exceeded. Please wait before sending more requests.',
        type: 'rate_limit_error',
      },
    });
  }

  next();
});

// --- API Routes ---

// 1. OpenAI-Compatible Chat Completions
app.post('/v1/chat/completions', handleChatCompletions);

// 2. OpenAI-Compatible Models
app.get('/v1/models', handleListModels);

// 3. Cryptographic Receipts
app.get('/v1/receipts/stats', handleReceiptStats);
app.get('/v1/receipts/:id', handleGetReceipt);
app.post('/v1/receipts/verify', handleVerifyReceipt);

// 4. Prepaid Keys for Developers & Agents
app.post('/v1/keys/prepaid', handleCreatePrepaidKey);
app.get('/v1/keys/:key/balance', handleGetKeyBalance);

// 5. Post-Quantum Keys & Public Verification Keys
app.get('/v1/quantum-keys', handleGetQuantumKeys);
app.get('/.well-known/qseal-keys.json', handleGetQuantumKeys);

// 6. MCP Protocol Handler
app.post('/mcp', handleMcpRequest);

// 7. Health & Status
app.get('/health', (req: Request, res: Response) => {
  const pubKeys = pqc.getPublicKeys();
  res.status(200).json({
    status: 'healthy',
    service: 'QSeal Gateway',
    version: '1.0.0',
    promise: 'Private AI for Solana agents. Prompts stay sealed. Quantum-resistant. Pay with USDC.',
    solana: {
      network: config.solanaNetwork,
      caip2: config.caip2Network,
      payTo: config.payTo,
      payToAta: solanaVerifier.getPayToAta(),
      usdc_mint: config.usdcMint,
      price_per_request_usdc: config.pricePerRequestUsdc,
    },
    pqc: {
      algorithms: 'NIST ML-KEM-768 + NIST ML-DSA-65 + Ed25519',
      ml_kem_pubkey_hash: pubKeys.mlKemPublicKey.slice(0, 16) + '...',
      ml_dsa_pubkey_hash: pubKeys.mlDsaPublicKey.slice(0, 16) + '...',
      verification_url: '/.well-known/qseal-keys.json',
    },
    upstream: {
      provider: config.upstreamProvider || 'none (using built-in zero-retention quantum engine)',
      active: Boolean(config.upstreamApiKey),
    },
    policies: {
      zero_prompt_retention: true,
      quantum_sealed_in_memory: true,
      verifiable_signed_receipts: true,
      official_x402_v2: true,
    },
  });
});

// Root Gateway Info
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    name: 'QSeal Gateway',
    tagline: 'Private AI for Solana agents. Prompts stay sealed. Quantum-resistant. Pay with USDC.',
    version: '1.0.0',
    endpoints: {
      completions: 'POST /v1/chat/completions',
      models: 'GET /v1/models',
      quantum_keys: 'GET /v1/quantum-keys',
      well_known_keys: 'GET /.well-known/qseal-keys.json',
      prepaid_keys: 'POST /v1/keys/prepaid',
      receipts: 'GET /v1/receipts/:id',
      verify_receipt: 'POST /v1/receipts/verify',
      mcp: 'POST /mcp',
      health: 'GET /health',
    },
    docs: 'https://github.com/qseal/qseal',
  });
});

export function startServer(port = config.port) {
  const server = app.listen(port, config.host, () => {
    console.log(`\n======================================================`);
    console.log(`🔒 QSEAL GATEWAY ONLINE: http://${config.host}:${port}`);
    console.log(`⚡ OpenAI-Compatible: POST /v1/chat/completions`);
    console.log(`💰 x402 V2 Solana Payments: ${config.pricePerRequestUsdc} USDC`);
    console.log(`📍 Solana Network: ${config.solanaNetwork} (${config.caip2Network})`);
    console.log(`💳 PayTo: ${config.payTo} (ATA: ${solanaVerifier.getPayToAta()})`);
    console.log(`⚛️  NIST PQC Active: ML-KEM-768 & ML-DSA-65`);
    console.log(`🔑 Verification Key: http://${config.host}:${port}/.well-known/qseal-keys.json`);
    console.log(`🌐 Live Model Provider: ${config.upstreamProvider || 'built-in quantum engine'}`);
    console.log(`🛡️  Zero Prompt Logging: Enforced`);
    console.log(`======================================================\n`);
  });
  return server;
}

const isMainModule = process.argv[1]?.replace(/\\/g, '/').endsWith('src/server.ts') || 
                     process.argv[1]?.replace(/\\/g, '/').endsWith('dist/server.js');

if (isMainModule && process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
