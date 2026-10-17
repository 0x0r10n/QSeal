import app from '../src/server.js';
import { pqc } from '../src/crypto/pqc.js';
import { PromptSealer } from '../src/crypto/seal.js';
import { ReceiptManager } from '../src/crypto/receipt.js';
import http from 'http';

let server: http.Server;
const TEST_PORT = 4029;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function request(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      res => {
        let rawData = '';
        res.on('data', chunk => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsedData = rawData;
          try {
            parsedData = JSON.parse(rawData);
          } catch {}
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            data: parsedData,
          });
        });
      }
    );

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`🧪 STARTING QSEAL COMPREHENSIVE PRODUCTION TEST SUITE`);
  console.log(`======================================================\n`);

  server = app.listen(TEST_PORT, '127.0.0.1');
  await new Promise(r => setTimeout(r, 200));

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}:`, err?.message || err);
      failed++;
    }
  }

  // TEST 1: Health & Gateway Status
  await test('GET /health returns healthy status, CAIP-2 network, and PQC keys', async () => {
    const res = await request('/health');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.data.status !== 'healthy') throw new Error('Status not healthy');
    if (!res.data.solana.caip2.startsWith('solana:')) throw new Error('Missing CAIP-2 network');
    if (!res.data.pqc.algorithms.includes('ML-KEM-768')) throw new Error('Missing ML-KEM-768');
  });

  // TEST 2: OpenAI-Compatible GET /v1/models with Pricing
  await test('GET /v1/models returns model list with capabilities and pricing', async () => {
    const res = await request('/v1/models');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.data.data) || res.data.data.length === 0) {
      throw new Error('Expected models array');
    }
    const quantumModel = res.data.data.find((m: any) => m.id === 'qseal-quantum-70b');
    if (!quantumModel) throw new Error('qseal-quantum-70b not found in model list');
    if (!quantumModel.capabilities.quantum_sealed) throw new Error('Model capabilities missing');
    if (!quantumModel.pricing?.price_per_request_usdc) throw new Error('Model pricing missing');
  });

  // TEST 3: Official Solana x402 V2 PAYMENT-REQUIRED Challenge
  let lastX402Challenge: any = null;
  await test('POST /v1/chat/completions unpaid returns official x402 V2 PAYMENT-REQUIRED header', async () => {
    const res = await request('/v1/chat/completions', {
      method: 'POST',
      body: {
        model: 'qseal-quantum-70b',
        messages: [{ role: 'user', content: 'Hello QSeal' }],
      },
    });

    if (res.status !== 402) throw new Error(`Expected 402 Payment Required, got ${res.status}`);
    
    // Check official x402 V2 header
    const paymentReqHeader = (res.headers['payment-required'] || res.headers['PAYMENT-REQUIRED']) as string;
    if (!paymentReqHeader) throw new Error('Missing official PAYMENT-REQUIRED header');
    
    const decoded = JSON.parse(Buffer.from(paymentReqHeader, 'base64').toString('utf8'));
    if (decoded.x402Version !== 2) throw new Error(`Expected x402Version 2, got ${decoded.x402Version}`);
    if (!decoded.accepts[0].network.startsWith('solana:')) throw new Error('Accepts network not CAIP-2');
    if (!decoded.accepts[0].payTo) throw new Error('Missing payTo in accepts');
    if (!decoded.accepts[0].asset) throw new Error('Missing asset in accepts');
    if (!decoded.accepts[0].price) throw new Error('Missing price in accepts');

    // Also check standard helper headers
    if (res.headers['x-payment-required'] !== 'true') throw new Error('Missing X-Payment-Required header');
    if (!res.headers['x-402-recipient']) throw new Error('Missing X-402-Recipient header');
    if (!res.headers['x-402-reference']) throw new Error('Missing X-402-Reference header');
    
    lastX402Challenge = decoded;
  });

  // TEST 4: Standard x402 V2 PAYMENT-SIGNATURE Header Payment Flow
  let lastReceiptId: string = '';
  const testTxSignature = `sim_tx_x402_v2_${Date.now()}`;
  await test('POST /v1/chat/completions with standard PAYMENT-SIGNATURE succeeds & returns PAYMENT-RESPONSE', async () => {
    const paymentPayload = {
      version: 2,
      network: lastX402Challenge.accepts[0].network,
      signature: testTxSignature,
    };
    const b64PaymentSig = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

    const res = await request('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'PAYMENT-SIGNATURE': b64PaymentSig,
      },
      body: {
        model: 'qseal-quantum-70b',
        messages: [{ role: 'user', content: 'What is QSeal?' }],
      },
    });

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.object !== 'chat.completion') throw new Error('Response object is not chat.completion');
    if (!res.data.choices[0].message.content) throw new Error('No content returned');
    
    // Check official settlement header PAYMENT-RESPONSE
    const paymentRespHeader = (res.headers['payment-response'] || res.headers['PAYMENT-RESPONSE']) as string;
    if (!paymentRespHeader) throw new Error('Missing PAYMENT-RESPONSE settlement header');
    const decodedResp = JSON.parse(Buffer.from(paymentRespHeader, 'base64').toString('utf8'));
    if (!decodedResp.settled) throw new Error('PAYMENT-RESPONSE not marked settled');

    const receiptIdHeader = res.headers['x-qseal-receipt-id'] as string;
    const receiptSigHeader = res.headers['x-qseal-receipt-signature'] as string;
    if (!receiptIdHeader) throw new Error('Missing X-QSeal-Receipt-Id header');
    if (!receiptSigHeader) throw new Error('Missing X-QSeal-Receipt-Signature header');
    if (!res.data.qseal_receipt) throw new Error('Missing qseal_receipt in response body');
    
    lastReceiptId = receiptIdHeader;
  });

  // TEST 5: Anti-Replay Protection
  await test('Anti-replay prevents double spending the exact same transaction signature', async () => {
    const paymentPayload = {
      version: 2,
      network: lastX402Challenge.accepts[0].network,
      signature: testTxSignature, // Already spent in Test 4
    };
    const b64PaymentSig = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

    const res = await request('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'PAYMENT-SIGNATURE': b64PaymentSig,
      },
      body: {
        model: 'qseal-quantum-70b',
        messages: [{ role: 'user', content: 'Replay attack test' }],
      },
    });

    if (res.status !== 402) throw new Error(`Expected 402 rejection on replay, got ${res.status}`);
  });

  // TEST 6: Stable Public Key at /.well-known/qseal-keys.json
  await test('GET /.well-known/qseal-keys.json returns stable public keys', async () => {
    const res = await request('/.well-known/qseal-keys.json');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.mlDsaPublicKey) throw new Error('Missing mlDsaPublicKey');
    if (!res.data.mlKemPublicKey) throw new Error('Missing mlKemPublicKey');
    if (!res.data.solana.payTo) throw new Error('Missing payTo in well-known keys');
  });

  // TEST 7: Cryptographic Receipt Verification against Stable Public Key
  await test('Receipt verification confirms ML-DSA-65 signature against stable public key', async () => {
    const res = await request(`/v1/receipts/${lastReceiptId}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.receipt) throw new Error('Missing receipt object');
    if (!res.data.verification.valid) throw new Error('Receipt verification failed');
    if (!res.data.verification.mlDsaValid) throw new Error('ML-DSA-65 signature invalid');

    // Also test POST /v1/receipts/verify
    const verifyPost = await request('/v1/receipts/verify', {
      method: 'POST',
      body: { receipt_id: lastReceiptId },
    });
    if (!verifyPost.data.verification.valid) throw new Error('POST verify failed');
  });

  // TEST 8: Post-Quantum Prompt Sealing (ML-KEM-768 + AES-256-GCM)
  await test('Client can seal prompt with ML-KEM-768 and gateway unseals in ephemeral RAM', async () => {
    const keysRes = await request('/v1/quantum-keys');
    const gatewayKemPub = keysRes.data.mlKemPublicKey;

    const clientPayload = {
      model: 'qseal-quantum-70b',
      messages: [{ role: 'user', content: 'Quantum-sealed secret agent prompt' }],
    };
    const sealed = PromptSealer.seal(clientPayload, gatewayKemPub);

    const res = await request('/v1/chat/completions', {
      method: 'POST',
      headers: {
        'X-Dev-Bypass': 'true',
      },
      body: sealed,
    });

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.headers['x-qseal-sealed'] !== 'true') throw new Error('Expected X-QSeal-Sealed header');
    if (!res.data.choices[0].message.content) throw new Error('Failed to unseal and complete');
    if (!res.data.qseal_receipt.sealed) throw new Error('Receipt did not flag sealed: true');
  });

  // TEST 9: Prepaid API Keys & Quota Deduction
  await test('Prepaid API key issuance and autonomous authorization', async () => {
    const createRes = await request('/v1/keys/prepaid', {
      method: 'POST',
      body: {
        wallet: 'SolanaAgentWallet1111111111111111111111111111',
        amount_usdc: 5.0,
      },
    });

    if (createRes.status !== 201) throw new Error(`Expected 201, got ${createRes.status}`);
    const apiKey = createRes.data.api_key;
    if (!apiKey || !apiKey.startsWith('qseal_sk_')) throw new Error('Invalid API key generated');

    const inferRes = await request('/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: {
        messages: [{ role: 'user', content: 'Prepaid key inference test' }],
      },
    });

    if (inferRes.status !== 200) throw new Error(`Expected 200, got ${inferRes.status}`);
    if (inferRes.data.qseal_receipt.payment.type !== 'prepaid-key') {
      throw new Error('Payment type not prepaid-key');
    }

    const balRes = await request(`/v1/keys/${apiKey}/balance`);
    if (balRes.data.total_requests !== 1) throw new Error('Request count did not increment');
    if (balRes.data.balance_usdc >= 5.0) throw new Error('Balance was not deducted');
  });

  // TEST 10: MCP (Model Context Protocol) Endpoint
  await test('MCP endpoint supports tool listing and execution', async () => {
    const listRes = await request('/mcp', {
      method: 'POST',
      body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });
    if (listRes.status !== 200) throw new Error(`Expected 200, got ${listRes.status}`);
    const tools = listRes.data.result.tools;
    if (!tools.find((t: any) => t.name === 'qseal_infer')) throw new Error('qseal_infer tool missing');

    const callRes = await request('/mcp', {
      method: 'POST',
      body: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'qseal_infer',
          arguments: { prompt: 'Agent autonomous MCP execution' },
        },
      },
    });
    if (callRes.status !== 200) throw new Error(`Expected 200, got ${callRes.status}`);
    if (!callRes.data.result.content[0].text) throw new Error('MCP content empty');
  });

  // Clean up
  server.close();

  console.log(`\n======================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  if (server) server.close();
  process.exit(1);
});
