/**
 * Client-side prompt sealing, matching the gateway's PromptSealer:
 * ML-KEM-768 encapsulation to the gateway key, SHA-256 of the shared secret
 * as an AES-256-GCM key, separate hex iv / authTag / ciphertext.
 *
 * Sealing protects the request between this browser and the gateway (on top
 * of TLS). The gateway decrypts it in memory to run inference.
 */
import { ml_kem768 } from '@noble/post-quantum/ml-kem'
import { bytesToHex, hexToBytes } from './bytes'

export interface SealedPayload {
  sealed: true
  kemCiphertext: string
  iv: string
  authTag: string
  ciphertext: string
  clientEphemeralKemPubkey?: string
}

async function aesKey(sharedSecret: Uint8Array, usage: KeyUsage) {
  const digest = await crypto.subtle.digest('SHA-256', sharedSecret as BufferSource)
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, [usage])
}

/** Seal a JSON body to the gateway; returns the payload and the secret needed to open the sealed reply. */
export async function sealRequest(body: unknown, gatewayKemPublicKeyHex: string) {
  const client = ml_kem768.keygen()
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(hexToBytes(gatewayKemPublicKeyHex))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await aesKey(sharedSecret, 'encrypt')
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(body))),
  )
  // WebCrypto appends the 16-byte tag; the gateway expects it separately.
  const payload: SealedPayload = {
    sealed: true,
    kemCiphertext: bytesToHex(cipherText),
    iv: bytesToHex(iv),
    authTag: bytesToHex(sealed.slice(-16)),
    ciphertext: bytesToHex(sealed.slice(0, -16)),
    clientEphemeralKemPubkey: bytesToHex(client.publicKey),
  }
  return { payload, clientSecretKey: client.secretKey }
}

/** Open a response the gateway sealed to our ephemeral key. */
export async function openSealedResponse(payload: SealedPayload, clientSecretKey: Uint8Array): Promise<unknown> {
  const shared = ml_kem768.decapsulate(hexToBytes(payload.kemCiphertext), clientSecretKey)
  const key = await aesKey(shared, 'decrypt')
  const joined = new Uint8Array([...hexToBytes(payload.ciphertext), ...hexToBytes(payload.authTag)])
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: hexToBytes(payload.iv) as BufferSource }, key, joined)
  const text = new TextDecoder().decode(plain)
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
