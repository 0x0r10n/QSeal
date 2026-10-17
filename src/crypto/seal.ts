import crypto from 'crypto';
import { pqc } from './pqc.js';

export interface SealedPayload {
  sealed: true;
  kemCiphertext: string; // hex of ML-KEM-768 ciphertext
  iv: string; // hex of 12-byte IV
  authTag: string; // hex of 16-byte GCM auth tag
  ciphertext: string; // hex of AES-256-GCM encrypted payload
  clientEphemeralKemPubkey?: string; // hex of client's public key if client wants sealed response
}

export interface DecryptedPrompt {
  isSealed: boolean;
  messages: any[];
  promptText: string;
  clientEphemeralPubkey?: string;
}

export class PromptSealer {
  /**
   * Encrypt arbitrary string/JSON using ML-KEM-768 encapsulation + AES-256-GCM (client helper)
   */
  public static seal(
    data: any,
    gatewayKemPubHex: string,
    clientEphemeralKemPubHex?: string
  ): SealedPayload {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    const { cipherTextHex, sharedSecret } = pqc.encapsulate(gatewayKemPubHex);

    // Derive 256-bit AES key from sharedSecret via SHA-256
    const aesKey = crypto.createHash('sha256').update(sharedSecret).digest();
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      sealed: true,
      kemCiphertext: cipherTextHex,
      iv: iv.toString('hex'),
      authTag,
      ciphertext: encrypted,
      clientEphemeralKemPubkey: clientEphemeralKemPubHex,
    };
  }

  /**
   * Decrypt sealed payload inside memory (Zero log, strictly ephemeral)
   */
  public static unseal(payload: SealedPayload): any {
    const sharedSecret = pqc.decapsulate(payload.kemCiphertext);
    const aesKey = crypto.createHash('sha256').update(sharedSecret).digest();
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }

  /**
   * Seal completion response back to the client if client requested sealed return
   */
  public static sealResponse(data: any, clientKemPubHex: string): SealedPayload {
    return this.seal(data, clientKemPubHex);
  }

  /**
   * Compute zero-knowledge SHA-256 hash of a prompt without storing it
   */
  public static hashContent(content: any): string {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}
