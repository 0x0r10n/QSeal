import { Request, Response } from 'express';
import { X402Manager } from '../payments/x402.js';
import { PromptSealer, SealedPayload } from '../crypto/seal.js';
import { ReceiptManager } from '../crypto/receipt.js';
import { ModelRouter, UpstreamError } from '../router/modelRouter.js';
import { StreamingHandler } from '../router/streaming.js';
import { validateChatBody } from './validate.js';

const apiError = (res: Response, status: number, message: string, type: string) =>
  res.status(status).json({ error: { message, type } });

export async function handleChatCompletions(req: Request, res: Response) {
  // 1. Unseal first (in memory) so the request is priced on the model it really asks for.
  let body = req.body;
  let isSealed = false;
  let clientEphemeralKemPubkey: string | undefined;
  if (body?.sealed === true || body?.kemCiphertext) {
    isSealed = true;
    const sealedPayload = body as SealedPayload;
    clientEphemeralKemPubkey = sealedPayload.clientEphemeralKemPubkey;
    // ML-KEM-768 public keys are 1184 bytes.
    if (clientEphemeralKemPubkey !== undefined && !/^[0-9a-f]{2368}$/i.test(clientEphemeralKemPubkey)) {
      return apiError(res, 400, 'clientEphemeralKemPubkey must be a hex ML-KEM-768 public key', 'invalid_sealed_payload');
    }
    try {
      body = PromptSealer.unseal(sealedPayload);
    } catch {
      return apiError(res, 400, 'Sealed payload could not be decrypted with this gateway’s ML-KEM key', 'invalid_sealed_payload');
    }
  }

  // 2. Validate before charging anything.
  const v = validateChatBody(body);
  if (!v.ok) return apiError(res, v.status, v.message, v.type);
  const completionReq = v.request;
  const model = completionReq.model;

  // 3. Payment: x402 on-chain, prepaid key, or dev bypass.
  const payment = await X402Manager.authenticateRequest(req, model);
  if (!payment.verified) {
    return X402Manager.send402Response(res, X402Manager.generateChallenge(model), payment.error);
  }

  // 4. Inference. Refund the charge if it fails.
  let result: Awaited<ReturnType<typeof ModelRouter.execute>>;
  try {
    result = await ModelRouter.execute(completionReq);
  } catch (err: any) {
    payment.refund?.();
    const status = err instanceof UpstreamError ? err.status : 500;
    return apiError(res, status, `${err?.message || 'Inference failed'}. You were not charged.`, 'upstream_error');
  }
  const { response, content } = result;
  X402Manager.attachPaymentResponse(res, payment);

  // 5. Signed receipt over hashes only (zero prompt retention).
  const receipt = ReceiptManager.create(
    model,
    PromptSealer.hashContent(completionReq.messages),
    PromptSealer.hashContent(content),
    {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    },
    { type: payment.type, reference: payment.reference, signature: payment.signature, amountUsdc: payment.amountUsdc },
    isSealed,
  );

  res.setHeader('X-QRouter-Receipt-Id', receipt.id);
  res.setHeader('X-QRouter-Receipt-Signature', receipt.pqc.mlDsaSignature);
  res.setHeader('X-QRouter-Receipt-Ed25519', receipt.pqc.ed25519Signature);
  res.setHeader('X-QRouter-PQC-Algorithm', receipt.pqc.algorithm);
  res.setHeader('X-QRouter-Prompt-Hash', receipt.promptHash);
  res.setHeader('X-QRouter-Response-Hash', receipt.responseHash);
  res.setHeader('X-QRouter-Sealed', isSealed ? 'true' : 'false');

  res.setHeader('X-QSeal-Receipt-Id', receipt.id);
  res.setHeader('X-QSeal-Receipt-Signature', receipt.pqc.mlDsaSignature);
  res.setHeader('X-QSeal-Receipt-Ed25519', receipt.pqc.ed25519Signature);
  res.setHeader('X-QSeal-PQC-Algorithm', receipt.pqc.algorithm);
  res.setHeader('X-QSeal-Prompt-Hash', receipt.promptHash);
  res.setHeader('X-QSeal-Response-Hash', receipt.responseHash);
  res.setHeader('X-QSeal-Sealed', isSealed ? 'true' : 'false');

  if (completionReq.stream) {
    StreamingHandler.initStream(res, receipt.id);
    return StreamingHandler.streamContent(res, response.id, model, content, receipt);
  }

  // Seal the response back to the client when it supplied an ephemeral ML-KEM key.
  if (isSealed && clientEphemeralKemPubkey) {
    return res.status(200).json({
      ...PromptSealer.sealResponse(response, clientEphemeralKemPubkey),
      qrouter_receipt: receipt,
      qseal_receipt: receipt,
      receipt,
    });
  }

  return res.status(200).json({
    ...response,
    qrouter_receipt: receipt,
    qseal_receipt: receipt,
    receipt,
  });
}
