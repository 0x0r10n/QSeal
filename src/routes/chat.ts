import { Request, Response } from 'express';
import { X402Manager } from '../payments/x402.js';
import { PromptSealer, SealedPayload } from '../crypto/seal.js';
import { ReceiptManager } from '../crypto/receipt.js';
import { ModelRouter, CompletionRequest } from '../router/modelRouter.js';
import { StreamingHandler } from '../router/streaming.js';

export async function handleChatCompletions(req: Request, res: Response) {
  try {
    const rawModel = req.body?.model || 'qseal-quantum-70b';

    // 1. Verify Payment via x402 V2 / Prepaid key / Dev bypass
    const payment = await X402Manager.authenticateRequest(req, rawModel);
    if (!payment.verified) {
      const challenge = X402Manager.generateChallenge(rawModel);
      return X402Manager.send402Response(res, challenge);
    }

    // Attach x402 V2 settlement confirmation header
    X402Manager.attachPaymentResponse(res, payment);

    // 2. Extract and handle Sealing (Zero-log, ephemeral decryption)
    let body = req.body;
    let isSealed = false;
    let clientEphemeralKemPubkey: string | undefined;

    if (body.sealed === true || body.kemCiphertext) {
      isSealed = true;
      const sealedPayload = body as SealedPayload;
      clientEphemeralKemPubkey = sealedPayload.clientEphemeralKemPubkey;
      // Unseal in memory
      body = PromptSealer.unseal(sealedPayload);
    }

    const messages = body.messages || [];
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Invalid request: messages array is required and cannot be empty',
          type: 'invalid_request_error',
        },
      });
    }

    const model = body.model || rawModel;
    const stream = Boolean(body.stream);

    // 3. Compute prompt hash without storing prompt (Zero-Retention)
    const promptHash = PromptSealer.hashContent(messages);

    const completionReq: CompletionRequest = {
      model,
      messages,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      stream,
    };

    // 4. Execute Inference (live upstream or sealed engine)
    const { response, content } = await ModelRouter.execute(completionReq);
    const responseHash = PromptSealer.hashContent(content);

    // 5. Generate Signed Post-Quantum Receipt
    const receipt = ReceiptManager.create(
      model,
      promptHash,
      responseHash,
      {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      {
        type: payment.type,
        reference: payment.reference,
        signature: payment.signature,
        amountUsdc: payment.amountUsdc,
      },
      isSealed
    );

    // 6. Set Cryptographic Receipt Headers
    res.setHeader('X-QSeal-Receipt-Id', receipt.id);
    res.setHeader('X-QSeal-Receipt-Signature', receipt.pqc.mlDsaSignature);
    res.setHeader('X-QSeal-Receipt-Ed25519', receipt.pqc.ed25519Signature);
    res.setHeader('X-QSeal-PQC-Algorithm', receipt.pqc.algorithm);
    res.setHeader('X-QSeal-Prompt-Hash', receipt.promptHash);
    res.setHeader('X-QSeal-Response-Hash', receipt.responseHash);
    res.setHeader('X-QSeal-Sealed', isSealed ? 'true' : 'false');

    // 7. Handle Streaming vs Non-Streaming
    if (stream) {
      StreamingHandler.initStream(res, receipt.id);
      return await StreamingHandler.streamContent(
        res,
        response.id,
        model,
        content,
        receipt
      );
    }

    // 8. If client requested sealed response return, seal the response back
    if (isSealed && clientEphemeralKemPubkey) {
      const sealedResponse = PromptSealer.sealResponse(response, clientEphemeralKemPubkey);
      return res.status(200).json({
        ...sealedResponse,
        qseal_receipt: receipt,
      });
    }

    // Standard OpenAI response with non-intrusive qseal_receipt field
    return res.status(200).json({
      ...response,
      qseal_receipt: receipt,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: {
        message: err?.message || 'Internal gateway inference error',
        type: 'api_error',
      },
    });
  }
}
