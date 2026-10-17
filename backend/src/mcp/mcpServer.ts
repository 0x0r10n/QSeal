import { Request, Response } from 'express';
import { ModelRouter } from '../router/modelRouter.js';
import { ReceiptManager } from '../crypto/receipt.js';
import { PromptSealer } from '../crypto/seal.js';

export const MCP_TOOLS = [
  {
    name: 'qseal_infer',
    description: 'Execute a private, quantum-sealed LLM inference with zero prompt retention and signed ML-DSA-65 receipt.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The prompt or query for the private AI model',
        },
        model: {
          type: 'string',
          description: 'Model identifier (default: qseal-quantum-70b)',
          default: 'qseal-quantum-70b',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'qseal_verify_receipt',
    description: 'Verify the cryptographic authenticity and ML-DSA-65 post-quantum signature of a QSeal inference receipt.',
    inputSchema: {
      type: 'object',
      properties: {
        receipt_id: {
          type: 'string',
          description: 'The unique receipt ID (rcpt_...) to verify',
        },
      },
      required: ['receipt_id'],
    },
  },
];

export async function handleMcpRequest(req: Request, res: Response) {
  const { method, params, id } = req.body;

  if (method === 'tools/list') {
    return res.status(200).json({
      jsonrpc: '2.0',
      id: id || 1,
      result: {
        tools: MCP_TOOLS,
      },
    });
  }

  if (method === 'tools/call') {
    const toolName = params?.name;
    const args = params?.arguments || {};

    if (toolName === 'qseal_infer') {
      const prompt = args.prompt;
      const model = args.model || 'qseal-quantum-70b';
      const promptHash = PromptSealer.hashContent(prompt);

      const { response, content } = await ModelRouter.execute({
        model,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseHash = PromptSealer.hashContent(content);
      const receipt = ReceiptManager.create(
        model,
        promptHash,
        responseHash,
        {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
        { type: 'dev-bypass', amountUsdc: 0.001 },
        false
      );

      return res.status(200).json({
        jsonrpc: '2.0',
        id: id || 1,
        result: {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
          qseal_receipt: receipt,
        },
      });
    }

    if (toolName === 'qseal_verify_receipt') {
      const receiptId = args.receipt_id;
      const receipt = ReceiptManager.get(receiptId);
      if (!receipt) {
        return res.status(200).json({
          jsonrpc: '2.0',
          id: id || 1,
          result: {
            isError: true,
            content: [{ type: 'text', text: `Receipt not found: ${receiptId}` }],
          },
        });
      }

      const verification = ReceiptManager.verify(receipt);
      return res.status(200).json({
        jsonrpc: '2.0',
        id: id || 1,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ receipt_id: receipt.id, verification }, null, 2),
            },
          ],
        },
      });
    }

    return res.status(404).json({
      jsonrpc: '2.0',
      id: id || 1,
      error: { code: -32601, message: `Method or tool not found: ${toolName}` },
    });
  }

  return res.status(400).json({
    jsonrpc: '2.0',
    id: id || 1,
    error: { code: -32600, message: 'Invalid MCP Request' },
  });
}
