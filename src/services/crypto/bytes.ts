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
const B58_MAP: Record<string, number> = {}
for (let i = 0; i < B58.length; i++) B58_MAP[B58[i]] = i

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

export function fromBase58(str: string): Uint8Array {
  const bytes = [0]
  for (let i = 0; i < str.length; i++) {
    const c = str[i]
    if (B58_MAP[c] === undefined) throw new Error('Invalid base58 character')
    for (let j = 0; j < bytes.length; j++) bytes[j] *= 58
    bytes[0] += B58_MAP[c]
    let carry = 0
    for (let j = 0; j < bytes.length; j++) {
      bytes[j] += carry
      carry = bytes[j] >> 8
      bytes[j] &= 0xff
    }
    while (carry) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }
  for (let i = 0; i < str.length && str[i] === '1'; i++) bytes.push(0)
  return new Uint8Array(bytes.reverse())
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
