import { Request, Response } from 'express';
import { ModelRouter, UpstreamError } from '../router/modelRouter.js';
import { ReceiptManager } from '../crypto/receipt.js';
import { PromptSealer } from '../crypto/seal.js';
import { X402Manager } from '../payments/x402.js';
import { config } from '../config.js';
import { validateChatBody } from '../routes/validate.js';

export const MCP_TOOLS = [
  {
    name: 'qseal_infer',
    description:
      'Run a private LLM inference through QSeal with a signed ML-DSA-65 receipt. Requires payment: an Authorization: Bearer prepaid key or an x402 PAYMENT-SIGNATURE header on the MCP request.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The prompt for the model' },
        model: { type: 'string', description: `Model identifier (default: ${config.defaultModel})` },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'qseal_verify_receipt',
    description: 'Verify a QSeal receipt against this gateway’s published ML-DSA-65 and Ed25519 keys.',
    inputSchema: {
      type: 'object',
      properties: { receipt_id: { type: 'string', description: 'Receipt ID (rcpt_...)' } },
      required: ['receipt_id'],
    },
  },
];

const rpc = (res: Response, id: unknown, payload: { result?: unknown; error?: { code: number; message: string; data?: unknown } }) =>
  res.status(200).json({ jsonrpc: '2.0', id: id ?? null, ...payload });

const toolText = (res: Response, id: unknown, text: string, isError = false, extra: Record<string, unknown> = {}) =>
  rpc(res, id, { result: { content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}), ...extra } });

export async function handleMcpRequest(req: Request, res: Response) {
  const { method, params, id } = req.body ?? {};

  if (method === 'initialize') {
    return rpc(res, id, {
      result: {
        protocolVersion: params?.protocolVersion || '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'qseal', version: '1.1.0' },
      },
    });
  }
  if (method === 'notifications/initialized') return res.status(202).end();
  if (method === 'tools/list') return rpc(res, id, { result: { tools: MCP_TOOLS } });

  if (method === 'tools/call') {
    const toolName = params?.name;
    const args = params?.arguments || {};

    if (toolName === 'qseal_infer') {
      if (typeof args.prompt !== 'string' || !args.prompt) return toolText(res, id, 'prompt is required', true);
      const v = validateChatBody({ model: args.model, messages: [{ role: 'user', content: args.prompt }] });
      if (!v.ok) return toolText(res, id, v.message, true);
      const model = v.request.model;

      const payment = await X402Manager.authenticateRequest(req, model);
      if (!payment.verified) {
        const challenge = X402Manager.generateChallenge(model);
        return rpc(res, id, {
          error: {
            code: 402,
            message: payment.error && payment.error !== 'No payment proof provided'
              ? `Payment required: ${payment.error}`
              : 'Payment required: send a prepaid key (Authorization: Bearer qseal_sk_…) or an x402 PAYMENT-SIGNATURE header',
            data: { x402: challenge },
          },
        });
      }

      try {
        const { response, content } = await ModelRouter.execute(v.request);
        const receipt = ReceiptManager.create(
          model,
          PromptSealer.hashContent(v.request.messages),
          PromptSealer.hashContent(content),
          {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          },
          { type: payment.type, reference: payment.reference, signature: payment.signature, amountUsdc: payment.amountUsdc },
          false,
        );
        return toolText(res, id, content, false, { qseal_receipt: receipt });
      } catch (err: any) {
        payment.refund?.();
        return toolText(res, id, `${err instanceof UpstreamError ? err.message : 'Inference failed'}. You were not charged.`, true);
      }
    }

    if (toolName === 'qseal_verify_receipt') {
      const receipt = typeof args.receipt_id === 'string' ? ReceiptManager.get(args.receipt_id) : undefined;
      if (!receipt) return toolText(res, id, `Receipt not found: ${args.receipt_id}`, true);
      return toolText(res, id, JSON.stringify({ receipt_id: receipt.id, verification: ReceiptManager.verify(receipt) }, null, 2));
    }

    return rpc(res, id, { error: { code: -32601, message: `Tool not found: ${toolName}` } });
  }

  return rpc(res, id, { error: { code: -32601, message: `Method not found: ${String(method)}` } });
}
