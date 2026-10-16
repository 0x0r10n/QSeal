/**
 * Receipt extraction and verification boundary.
 *
 * QSeal issues signed receipts for inference, but the receipt wire format and
 * verification procedure have not been supplied to this frontend. Until they
 * are, these functions deliberately return "not configured" results. They
 * must NEVER report a receipt as valid without performing real verification.
 */

export type VerificationOutcome =
  | { status: 'valid'; summary: string; details: Array<[string, string]> }
  | { status: 'invalid'; summary: string; details: Array<[string, string]> }
  | { status: 'unable'; summary: string; reason: string }
  | { status: 'unsupported'; summary: string; reason: string }

export interface ReceiptVerifier {
  name: string
  /** Return null when the input is not in this verifier's format. */
  verify(input: unknown): Promise<VerificationOutcome | null>
}

/** Register real verifiers here once the format is known. */
const verifiers: ReceiptVerifier[] = []

export const verificationConfigured = () => verifiers.length > 0

export async function verifyReceipt(text: string): Promise<VerificationOutcome> {
  const trimmed = text.trim()
  if (!trimmed) return { status: 'unsupported', summary: 'Nothing to verify', reason: 'Paste or drop a receipt first.' }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return {
      status: 'unsupported',
      summary: 'Unsupported format',
      reason: 'The input is not valid JSON. Receipts are expected as JSON documents.',
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { status: 'unsupported', summary: 'Unsupported format', reason: 'Expected a JSON object.' }
  }

  for (const v of verifiers) {
    const out = await v.verify(parsed)
    if (out) return out
  }

  return {
    status: 'unable',
    summary: 'Unable to verify',
    reason: verificationConfigured()
      ? 'No configured verifier recognised this receipt.'
      : 'No verification mechanism is configured in this deployment. The document was parsed but its signature was not checked.',
  }
}

/** Pull a receipt out of a completion response, once the format is known. */
export function extractReceipt(_raw: unknown, _headers: Record<string, string>): unknown | null {
  return null
}
