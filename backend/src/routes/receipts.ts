import { Request, Response } from 'express';
import { ReceiptManager, QSealReceipt } from '../crypto/receipt.js';

export function handleGetReceipt(req: Request, res: Response) {
  const id = String(req.params.id);
  const receipt = ReceiptManager.get(id);
  if (!receipt) return res.status(404).json({ error: { message: `Receipt not found: ${id}`, type: 'not_found' } });
  return res.status(200).json({ receipt, verification: ReceiptManager.verify(receipt) });
}

/** POST /v1/receipts/verify — body { receipt } or { receipt_id }. */
export function handleVerifyReceipt(req: Request, res: Response) {
  const { receipt, receipt_id } = req.body ?? {};
  let target: QSealReceipt | undefined = receipt && typeof receipt === 'object' ? receipt : undefined;
  if (!target && typeof receipt_id === 'string') target = ReceiptManager.get(receipt_id);

  if (!target) {
    return res.status(receipt_id ? 404 : 400).json({
      valid: false,
      error: receipt_id ? `Receipt not found: ${receipt_id}` : 'Provide a receipt object or a receipt_id',
    });
  }

  return res.status(200).json({
    receipt_id: target.id,
    timestamp: target.timestamp,
    model: target.model,
    tokens: target.tokens,
    prompt_hash: target.promptHash,
    response_hash: target.responseHash,
    verification: ReceiptManager.verify(target),
  });
}

export function handleReceiptStats(_req: Request, res: Response) {
  return res.status(200).json(ReceiptManager.getStats());
}
