import http from 'http';
import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Isolated, development-mode environment. Set before the app modules load.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qseal-test-'));
process.env.NODE_ENV = 'test';
process.env.ALLOW_DEV_BYPASS = 'true';
process.env.DATABASE_PATH = path.join(tmp, 'qseal.db');
process.env.PQC_KEYS_FILE = path.join(tmp, 'keys.json');
for (const k of ['GROQ_API_KEY', 'OPENROUTER_API_KEY', 'TOGETHER_API_KEY', 'FIREWORKS_API_KEY', 'UPSTREAM_API_KEY', 'OPENAI_API_KEY']) {
  delete process.env[k];
}

const { default: app } = await import('../src/server.js');
const { config, validateProductionConfig } = await import('../src/config.js');
const { PromptSealer } = await import('../src/crypto/seal.js');
const { ReceiptManager } = await import('../src/crypto/receipt.js');
const { closeDb } = await import('../src/store/db.js');
const { solanaVerifier } = await import('../src/payments/solana.js');
const web3 = await import('@solana/web3.js');
const { ml_kem768 } = await import('@noble/post-quantum/ml-kem');
const { ml_dsa65 } = await import('@noble/post-quantum/ml-dsa');

let server: http.Server;
const TEST_PORT = 4029;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function request(
  p: string,
  options: { method?: string; headers?: Record<string, string>; body?: any } = {},
): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      new URL(p, BASE_URL),
      { method: options.method || 'GET', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let data: any = raw;
          try {
            data = JSON.parse(raw);
          } catch {}
          resolve({ status: res.statusCode || 500, headers: res.headers, data });
        });
      },
    );
    req.on('error', reject);
    if (options.body !== undefined) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

const assert = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(msg);
};
const chat = (body: any, headers: Record<string, string> = {}) =>
  request('/v1/chat/completions', { method: 'POST', headers, body });
const msg = (content: string) => ({ model: 'qseal-quantum-70b', messages: [{ role: 'user', content }] });
const paymentSig = (signature: string) => Buffer.from(JSON.stringify({ version: 2, signature })).toString('base64');

/** Point the gateway at an unreachable provider so models are "available" but inference fails. */
function withBrokenUpstream<T>(fn: () => Promise<T>): Promise<T> {
  const saved = { p: config.upstreamProvider, u: config.upstreamBaseUrl, k: config.upstreamApiKey, m: process.env.UPSTREAM_MODEL_MAP };
  config.upstreamProvider = 'custom';
  config.upstreamBaseUrl = 'http://127.0.0.1:1';
  config.upstreamApiKey = 'test';
  process.env.UPSTREAM_MODEL_MAP = 'qseal-quantum-70b=test-model';
  return fn().finally(() => {
    config.upstreamProvider = saved.p;
    config.upstreamBaseUrl = saved.u;
    config.upstreamApiKey = saved.k;
    if (saved.m === undefined) delete process.env.UPSTREAM_MODEL_MAP;
    else process.env.UPSTREAM_MODEL_MAP = saved.m;
  });
}

async function runTests() {
  console.log(`\n=== QSeal gateway test suite ===\n`);
  server = app.listen(TEST_PORT, '127.0.0.1');
  await new Promise((r) => setTimeout(r, 200));

  let passed = 0;
  let failed = 0;
  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`PASS  ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`FAIL  ${name}: ${err?.message || err}`);
      failed++;
    }
  }

  await test('GET /health reports mode, CAIP-2 network and PQC algorithms', async () => {
    const res = await request('/health');
    assert(res.status === 200 && res.data.status === 'healthy', `health ${res.status}`);
    assert(res.data.mode === 'development', 'mode should be development in tests');
    assert(res.data.solana.caip2.startsWith('solana:'), 'missing CAIP-2');
    assert(res.data.pqc.algorithms.includes('ML-KEM-768'), 'missing ML-KEM-768');
  });

  await test('GET /v1/models lists catalogue models with pricing and who serves them', async () => {
    const res = await request('/v1/models');
    const m = res.data.data.find((x: any) => x.id === 'qseal-quantum-70b');
    assert(m, 'qseal-quantum-70b missing');
    assert(m.pricing.price_per_request_usdc > 0, 'pricing missing');
    assert(m.served_by.provider === 'dev-engine', `served_by ${JSON.stringify(m.served_by)}`);
    assert(m.vendor === 'meta' && m.family === 'Llama 3.3 70B Instruct', `vendor/family ${m.vendor} ${m.family}`);
  });

  let challenge: any;
  await test('Unpaid chat request returns an x402 V2 PAYMENT-REQUIRED challenge', async () => {
    const res = await chat(msg('Hello'));
    assert(res.status === 402, `expected 402, got ${res.status}`);
    challenge = JSON.parse(Buffer.from(res.headers['payment-required'] as string, 'base64').toString('utf8'));
    assert(challenge.x402Version === 2, 'x402Version');
    assert(challenge.accepts[0].network.startsWith('solana:'), 'network');
    assert(res.headers['x-402-reference'], 'reference header');
  });

  let receiptId = '';
  const simSig = `sim_tx_${Date.now()}`;
  await test('Paid request succeeds with PAYMENT-RESPONSE and a v2 signed receipt', async () => {
    const res = await chat(msg('What is QSeal?'), { 'PAYMENT-SIGNATURE': paymentSig(simSig) });
    assert(res.status === 200, `expected 200, got ${res.status} ${JSON.stringify(res.data)}`);
    assert(res.data.choices[0].message.content.includes('dev engine'), 'dev engine output must be labelled');
    const settle = JSON.parse(Buffer.from(res.headers['payment-response'] as string, 'base64').toString('utf8'));
    assert(settle.settled, 'not settled');
    assert(res.data.qseal_receipt.version === '2', 'receipt version');
    receiptId = res.headers['x-qseal-receipt-id'] as string;
  });

  await test('Replaying a spent payment signature is rejected', async () => {
    const res = await chat(msg('Replay'), { 'PAYMENT-SIGNATURE': paymentSig(simSig) });
    assert(res.status === 402, `expected 402, got ${res.status}`);
    assert(/already spent/.test(res.data.error.reason), 'reason should mention replay');
  });

  await test('GET /.well-known/qseal-keys.json returns public keys only', async () => {
    const res = await request('/.well-known/qseal-keys.json');
    assert(res.data.mlDsaPublicKey && res.data.mlKemPublicKey, 'keys missing');
    assert(!JSON.stringify(res.data).includes('SecretKey'), 'secret material exposed');
  });

  await test('Receipts verify by ID and by body against the gateway keys', async () => {
    const byId = await request(`/v1/receipts/${receiptId}`);
    assert(byId.data.verification.valid && byId.data.verification.signerMatchesGateway, 'GET verify failed');
    const byBody = await request('/v1/receipts/verify', { method: 'POST', body: { receipt: byId.data.receipt } });
    assert(byBody.data.verification.valid, 'POST verify failed');
  });

  await test('A tampered receipt is rejected', async () => {
    const { data } = await request(`/v1/receipts/${receiptId}`);
    const tampered = { ...data.receipt, model: 'qseal-deepseek-r1' };
    const res = await request('/v1/receipts/verify', { method: 'POST', body: { receipt: tampered } });
    assert(res.data.verification.valid === false, 'tampered receipt accepted');
  });

  await test('A receipt signed with someone else’s keys is rejected', async () => {
    const { data } = await request(`/v1/receipts/${receiptId}`);
    const forged = { ...data.receipt, id: 'rcpt_forged' };
    const canonical = ReceiptManager.canonicalString(forged);
    const dsa = ml_dsa65.keygen(crypto.randomBytes(32));
    const ed = crypto.generateKeyPairSync('ed25519');
    const edPub = ed.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex');
    forged.pqc = {
      ...forged.pqc,
      mlDsaPublicKey: Buffer.from(dsa.publicKey).toString('hex'),
      ed25519PublicKey: edPub,
      mlDsaSignature: Buffer.from(ml_dsa65.sign(dsa.secretKey, new TextEncoder().encode(canonical))).toString('hex'),
      ed25519Signature: crypto.sign(null, Buffer.from(canonical), ed.privateKey).toString('hex'),
    };
    const res = await request('/v1/receipts/verify', { method: 'POST', body: { receipt: forged } });
    assert(res.data.verification.valid === false, 'forged receipt accepted');
    assert(res.data.verification.signerMatchesGateway === false, 'signer check');
  });

  await test('Sealed prompt is unsealed in memory and the response is sealed back', async () => {
    const keys = await request('/v1/quantum-keys');
    const client = ml_kem768.keygen();
    const sealed = PromptSealer.seal(msg('Sealed secret'), keys.data.mlKemPublicKey, Buffer.from(client.publicKey).toString('hex'));
    const res = await chat(sealed, { 'X-Dev-Bypass': 'true' });
    assert(res.status === 200, `expected 200, got ${res.status} ${JSON.stringify(res.data)}`);
    assert(res.headers['x-qseal-sealed'] === 'true', 'sealed header');
    assert(res.data.qseal_receipt.sealed === true, 'receipt sealed flag');
    // Decrypt the sealed response with the client's ephemeral secret key.
    const shared = ml_kem768.decapsulate(Buffer.from(res.data.kemCiphertext, 'hex'), client.secretKey);
    const key = crypto.createHash('sha256').update(shared).digest();
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(res.data.iv, 'hex'));
    d.setAuthTag(Buffer.from(res.data.authTag, 'hex'));
    const inner = JSON.parse(d.update(res.data.ciphertext, 'hex', 'utf8') + d.final('utf8'));
    assert(inner.choices[0].message.content, 'sealed response did not decrypt');
  });

  await test('A garbage sealed payload is a 400, not a 500', async () => {
    const res = await chat({ sealed: true, kemCiphertext: '00', iv: '00', authTag: '00', ciphertext: '00' }, { 'X-Dev-Bypass': 'true' });
    assert(res.status === 400, `expected 400, got ${res.status}`);
  });

  let apiKey = '';
  await test('Prepaid keys cannot be minted without a deposit', async () => {
    const res = await request('/v1/keys/prepaid', { method: 'POST', body: { wallet: 'W', amount_usdc: 1000 } });
    assert(res.status === 402, `expected 402, got ${res.status}`);
  });

  await test('Prepaid key (dev) authorises requests and deducts per request', async () => {
    const created = await request('/v1/keys/prepaid', { method: 'POST', body: { dev: true, amount_usdc: 5 } });
    assert(created.status === 201, `expected 201, got ${created.status}`);
    apiKey = created.data.api_key;
    const res = await chat(msg('Prepaid'), { Authorization: `Bearer ${apiKey}` });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(res.data.qseal_receipt.payment.type === 'prepaid-key', 'payment type');
    const bal = await request('/v1/keys/balance', { headers: { Authorization: `Bearer ${apiKey}` } });
    assert(bal.data.total_requests === 1, 'request count');
    assert(bal.data.balance_usdc < 5, 'balance not deducted');
  });

  await test('Unknown models are rejected before anything is charged', async () => {
    const before = (await request('/v1/keys/balance', { headers: { Authorization: `Bearer ${apiKey}` } })).data;
    const res = await chat({ model: 'gpt-nope', messages: [{ role: 'user', content: 'x' }] }, { Authorization: `Bearer ${apiKey}` });
    assert(res.status === 404, `expected 404, got ${res.status}`);
    const after = (await request('/v1/keys/balance', { headers: { Authorization: `Bearer ${apiKey}` } })).data;
    assert(after.balance_usdc === before.balance_usdc, 'charged for an invalid request');
  });

  await test('Failed inference refunds the prepaid key', async () => {
    const before = (await request('/v1/keys/balance', { headers: { Authorization: `Bearer ${apiKey}` } })).data;
    const res = await withBrokenUpstream(() => chat(msg('Will fail'), { Authorization: `Bearer ${apiKey}` }));
    assert(res.status === 502, `expected 502, got ${res.status}`);
    assert(/not charged/.test(res.data.error.message), 'error should say not charged');
    const after = (await request('/v1/keys/balance', { headers: { Authorization: `Bearer ${apiKey}` } })).data;
    assert(after.balance_usdc === before.balance_usdc && after.total_requests === before.total_requests, 'not refunded');
  });

  await test('Failed inference releases an on-chain payment for retry', async () => {
    const sig = `sim_tx_retry_${Date.now()}`;
    const failed1 = await withBrokenUpstream(() => chat(msg('x'), { 'PAYMENT-SIGNATURE': paymentSig(sig) }));
    assert(failed1.status === 502, `expected 502, got ${failed1.status}`);
    const retry = await chat(msg('x'), { 'PAYMENT-SIGNATURE': paymentSig(sig) });
    assert(retry.status === 200, `retry should succeed, got ${retry.status}`);
  });

  await test('With dev bypass off, bypass header, simulated payments and free keys are refused', async () => {
    config.allowDevBypass = false;
    try {
      await withBrokenUpstream(async () => {
        const bypass = await chat(msg('free?'), { 'X-Dev-Bypass': 'true' });
        assert(bypass.status === 402, `bypass header: ${bypass.status}`);
        const sim = await chat(msg('free?'), { 'PAYMENT-SIGNATURE': paymentSig(`sim_tx_${Date.now()}`) });
        assert(sim.status === 402, `simulated payment: ${sim.status}`);
        const key = await request('/v1/keys/prepaid', { method: 'POST', body: { dev: true, amount_usdc: 50 } });
        assert(key.status === 402, `free key: ${key.status}`);
      });
    } finally {
      config.allowDevBypass = true;
    }
  });

  await test('Without a provider in production mode, requests fail closed', async () => {
    config.allowDevBypass = false;
    try {
      const res = await chat(msg('x'), { Authorization: `Bearer ${apiKey}` });
      assert(res.status === 404, `expected model unavailable, got ${res.status}`);
      const models = await request('/v1/models');
      assert(models.data.data.length === 0, 'no models should be listed');
    } finally {
      config.allowDevBypass = true;
    }
  });

  await test('MCP: initialize, list tools, paid inference only', async () => {
    const init = await request('/mcp', { method: 'POST', body: { jsonrpc: '2.0', id: 0, method: 'initialize', params: {} } });
    assert(init.data.result.serverInfo.name === 'qseal', 'initialize');
    const list = await request('/mcp', { method: 'POST', body: { jsonrpc: '2.0', id: 1, method: 'tools/list' } });
    assert(list.data.result.tools.some((t: any) => t.name === 'qseal_infer'), 'tool missing');
    const call = { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'qseal_infer', arguments: { prompt: 'Agent call' } } };
    const unpaid = await request('/mcp', { method: 'POST', body: call });
    assert(unpaid.data.error?.code === 402, `unpaid MCP call should be refused: ${JSON.stringify(unpaid.data)}`);
    const paid = await request('/mcp', { method: 'POST', body: call, headers: { Authorization: `Bearer ${apiKey}` } });
    assert(paid.data.result.content[0].text && paid.data.result.qseal_receipt, 'paid MCP call failed');
  });

  await test('Access log never contains prepaid key secrets', async () => {
    const lines: string[] = [];
    const orig = console.log;
    console.log = (...a: unknown[]) => {
      lines.push(a.join(' '));
      orig(...a);
    };
    try {
      await request(`/v1/keys/${apiKey}/balance`);
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      console.log = orig;
    }
    assert(lines.length > 0, 'nothing logged');
    assert(!lines.some((l) => l.includes(apiKey)), 'key leaked into logs');
  });

  await test('Invalid JSON gets a JSON 400', async () => {
    const res = await request('/v1/chat/completions', { method: 'POST', body: '{not json' });
    assert(res.status === 400 && res.data.error, `expected JSON 400, got ${res.status}`);
  });

  await test('Balances, receipts and spent payments survive a restart', async () => {
    closeDb();
    const bal = await request('/v1/keys/balance', { headers: { Authorization: `Bearer ${apiKey}` } });
    assert(bal.status === 200, 'key lost after reopen');
    const rec = await request(`/v1/receipts/${receiptId}`);
    assert(rec.status === 200 && rec.data.verification.valid, 'receipt lost after reopen');
    const replay = await chat(msg('Replay after restart'), { 'PAYMENT-SIGNATURE': paymentSig(simSig) });
    assert(replay.status === 402, 'spent payment usable again after restart');
  });

  // --- On-chain payment verification against a stubbed RPC (no network needed) ---
  const treasury = web3.Keypair.generate().publicKey.toBase58();
  const payerKey = web3.Keypair.generate().publicKey.toBase58();
  const conn = (solanaVerifier as any).connection;
  const realConn = { getParsedTransaction: conn.getParsedTransaction, getLatestBlockhash: conn.getLatestBlockhash };
  const savedPayTo = config.payTo;
  (solanaVerifier as any).payToAtaCache = null;
  config.payTo = treasury;
  config.allowDevBypass = false;
  const ata = solanaVerifier.getPayToAta();
  const fakeTx = (opts: { micro: number; mint?: string; owner?: string; ageSec?: number; err?: unknown }) => ({
    blockTime: Math.floor(Date.now() / 1000) - (opts.ageSec ?? 5),
    meta: {
      err: opts.err ?? null,
      preTokenBalances: [{ accountIndex: 1, mint: opts.mint ?? config.usdcMint, owner: opts.owner ?? treasury, uiTokenAmount: { amount: '1000000' } }],
      postTokenBalances: [{ accountIndex: 1, mint: opts.mint ?? config.usdcMint, owner: opts.owner ?? treasury, uiTokenAmount: { amount: String(1000000 + opts.micro) } }],
      preBalances: [0, 0],
      postBalances: [0, 0],
    },
    transaction: { message: { accountKeys: [{ pubkey: new web3.PublicKey(payerKey) }, { pubkey: new web3.PublicKey(opts.owner === treasury || !opts.owner ? ata : payerKey) }] } },
  });
  let nextTx: any = null;
  conn.getParsedTransaction = async () => nextTx;
  conn.getLatestBlockhash = async () => ({ blockhash: web3.Keypair.generate().publicKey.toBase58(), lastValidBlockHeight: 1 });

  const sig = () => `5${crypto.randomBytes(40).toString('hex')}`;
  try {
    await test('On-chain: a USDC transfer of the right amount to the treasury is accepted once', async () => {
      nextTx = fakeTx({ micro: 2000 });
      const s = sig();
      const ok = await solanaVerifier.verifyPayment(s, undefined, 0.001);
      assert(ok.verified && ok.amountUsdc === 0.002 && ok.payer === payerKey, JSON.stringify(ok));
      const again = await solanaVerifier.verifyPayment(s, undefined, 0.001);
      assert(!again.verified, 'replay accepted');
    });
    await test('On-chain: underpayment, wrong mint, wrong recipient, stale or failed tx are refused', async () => {
      const cases: Array<[string, any]> = [
        ['underpaid', fakeTx({ micro: 500 })],
        ['wrong mint', fakeTx({ micro: 5000, mint: web3.Keypair.generate().publicKey.toBase58() })],
        ['wrong recipient', fakeTx({ micro: 5000, owner: web3.Keypair.generate().publicKey.toBase58() })],
        ['too old', fakeTx({ micro: 5000, ageSec: config.maxPaymentAgeSec + 60 })],
        ['failed on-chain', fakeTx({ micro: 5000, err: { InstructionError: [0, 'Custom'] } })],
      ];
      for (const [name, tx] of cases) {
        nextTx = tx;
        const r = await solanaVerifier.verifyPayment(sig(), undefined, 0.001);
        assert(!r.verified, `${name} was accepted`);
      }
    });
    await test('On-chain: a refused (underpaid) signature is released, a stale one stays burned', async () => {
      const s1 = sig();
      nextTx = fakeTx({ micro: 500 });
      await solanaVerifier.verifyPayment(s1, undefined, 0.001);
      assert(!solanaVerifier.isSpent(s1), 'underpaid signature should not be burned');
      const s2 = sig();
      nextTx = fakeTx({ micro: 5000, ageSec: config.maxPaymentAgeSec + 60 });
      await solanaVerifier.verifyPayment(s2, undefined, 0.001);
      assert(solanaVerifier.isSpent(s2), 'stale signature must stay burned');
    });
    await test('Prepaid key purchase credits the verified on-chain deposit to the paying wallet', async () => {
      nextTx = fakeTx({ micro: 2_500_000 });
      const res = await request('/v1/keys/prepaid', { method: 'POST', body: { payment_signature: sig() } });
      assert(res.status === 201, `expected 201, got ${res.status} ${JSON.stringify(res.data)}`);
      assert(res.data.balance_usdc === 2.5 && res.data.wallet_address === payerKey, JSON.stringify(res.data));
      nextTx = fakeTx({ micro: 100_000 });
      const small = await request('/v1/keys/prepaid', { method: 'POST', body: { payment_signature: sig() } });
      assert(small.status === 402, 'deposit below the minimum was accepted');
    });
    await test('POST /v1/payments/prepare builds an unsigned USDC transfer for the wallet', async () => {
      const res = await withBrokenUpstream(() => request('/v1/payments/prepare', { method: 'POST', body: { payer: payerKey, purpose: 'request', model: 'qseal-quantum-70b' } }));
      assert(res.status === 200, `expected 200, got ${res.status} ${JSON.stringify(res.data)}`);
      const tx = web3.Transaction.from(Buffer.from(res.data.transaction, 'base64'));
      assert(tx.feePayer?.toBase58() === payerKey, 'fee payer');
      const transfer = tx.instructions[tx.instructions.length - 1];
      assert(transfer.keys.some((k: any) => k.pubkey.toBase58() === res.data.reference), 'reference key missing');
      assert(transfer.keys.some((k: any) => k.pubkey.toBase58() === ata), 'treasury ATA missing');
      const amount = transfer.data.readBigUInt64LE(1);
      assert(amount === 1000n, `amount ${amount}`);
      const bad = await request('/v1/payments/prepare', { method: 'POST', body: { payer: payerKey, purpose: 'deposit', amount_usdc: 0.01 } });
      assert(bad.status === 400, 'deposit below the minimum should be refused');
    });
  } finally {
    conn.getParsedTransaction = realConn.getParsedTransaction;
    conn.getLatestBlockhash = realConn.getLatestBlockhash;
    config.payTo = savedPayTo;
    (solanaVerifier as any).payToAtaCache = null;
    config.allowDevBypass = true;
  }

  await test('Production config check refuses dev bypass and a missing treasury', async () => {
    const saved = config.isProduction;
    config.isProduction = true;
    try {
      const problems = validateProductionConfig();
      assert(problems.some((p) => p.includes('ALLOW_DEV_BYPASS')), 'bypass not flagged');
      assert(problems.some((p) => p.includes('SOLANA_PAY_TO')), 'treasury not flagged');
    } finally {
      config.isProduction = saved;
    }
  });

  server.close();
  closeDb();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  server?.close();
  process.exit(1);
});
