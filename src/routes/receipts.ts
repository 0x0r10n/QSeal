import { Request, Response } from 'express';
import { ReceiptManager, QSealReceipt } from '../crypto/receipt.js';

export function handleGetReceipt(req: Request, res: Response) {
  const id = String(req.params.id);
  const receipt = ReceiptManager.get(id);

  if (!receipt) {
    return res.status(404).json({
      error: {
        message: `Receipt not found with ID: ${id}`,
        type: 'not_found',
      },
    });
  }

  const verification = ReceiptManager.verify(receipt);

  return res.status(200).json({
    receipt,
    verification,
  });
}

export function handleVerifyReceipt(req: Request, res: Response) {
  const { receipt, receipt_id } = req.body;

  let targetReceipt: QSealReceipt | undefined = receipt;
  if (!targetReceipt && receipt_id) {
    targetReceipt = ReceiptManager.get(receipt_id);
  }

  if (!targetReceipt) {
    return res.status(400).json({
      valid: false,
      error: 'Must provide either receipt object or valid receipt_id in request body',
    });
  }

  const result = ReceiptManager.verify(targetReceipt);

  return res.status(200).json({
    receipt_id: targetReceipt.id,
    timestamp: targetReceipt.timestamp,
    model: targetReceipt.model,
    tokens: targetReceipt.tokens,
    prompt_hash: targetReceipt.promptHash,
    response_hash: targetReceipt.responseHash,
    verification: result,
  });
}

export function handleReceiptStats(req: Request, res: Response) {
  return res.status(200).json(ReceiptManager.getStats());
}
