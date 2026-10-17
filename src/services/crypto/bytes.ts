export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 || /[^0-9a-f]/i.test(hex)) throw new Error('Invalid hex string')
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/** Base58 (Bitcoin alphabet), used for Solana signatures and addresses. */
export function toBase58(bytes: Uint8Array): string {
  const digits: number[] = []
  for (const byte of bytes) {
    let carry = byte
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8
      digits[j] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }
  let out = ''
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) out += '1'
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]]
  return out
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
