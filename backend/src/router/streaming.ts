import { Response } from 'express';
import { QSealReceipt } from '../crypto/receipt.js';

export class StreamingHandler {
  public static initStream(res: Response, receiptId: string) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('X-QSeal-Receipt-Id', receiptId);
    res.flushHeaders?.();
  }

  public static async streamContent(
    res: Response,
    id: string,
    model: string,
    fullContent: string,
    receipt: QSealReceipt
  ) {
    const created = Math.floor(Date.now() / 1000);

    // Initial role delta
    const roleChunk = {
      id,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [
        {
          index: 0,
          delta: { role: 'assistant', content: '' },
          finish_reason: null,
        },
      ],
    };
    res.write(`data: ${JSON.stringify(roleChunk)}\n\n`);

    // Split content into small chunks (words/tokens)
    const words = fullContent.split(' ');
    for (let i = 0; i < words.length; i++) {
      const token = (i === 0 ? '' : ' ') + words[i];
      const chunk = {
        id,
        object: 'chat.completion.chunk',
        created,
        model,
        choices: [
          {
            index: 0,
            delta: { content: token },
            finish_reason: null,
          },
        ],
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      // Small delay between chunks for realistic token streaming
      await new Promise(r => setTimeout(r, 15));
    }

    // Stop chunk
    const stopChunk = {
      id,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
      qseal_receipt: receipt,
    };
    res.write(`data: ${JSON.stringify(stopChunk)}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
}
