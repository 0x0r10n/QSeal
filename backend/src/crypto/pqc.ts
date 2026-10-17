import { ml_kem768 } from '@noble/post-quantum/ml-kem';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

export interface PQCKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface GatewayPublicKeys {
  algorithm: 'ML-KEM-768 + ML-DSA-65 + Ed25519';
  mlKemPublicKey: string; // hex
  mlDsaPublicKey: string; // hex
  ed25519PublicKey: string; // hex
  generatedAt: string;
}

export interface HybridSignature {
  mlDsaSignature: string; // hex
  ed25519Signature: string; // hex
  algorithm: string;
}

interface StoredKeysSchema {
  version: '1.0';
  generatedAt: string;
  mlKemPublicKey: string;
  mlKemSecretKey: string;
  mlDsaSeed: string;
  mlDsaPublicKey: string;
  mlDsaSecretKey: string;
  ed25519PrivateKeyPem: string;
  ed25519PublicKeyPem: string;
  ed25519PubHex: string;
}

class PQCManager {
  private kemKeys: PQCKeyPair;
  private dsaKeys: PQCKeyPair;
  private edKeyPair: { publicKey: crypto.KeyObject; privateKey: crypto.KeyObject; pubHex: string };
  private initializedAt: string;

  constructor() {
    // Attempt to load existing stable keys from file or env
    const loaded = this.tryLoadKeys();
    if (loaded) {
      this.kemKeys = loaded.kemKeys;
      this.dsaKeys = loaded.dsaKeys;
      this.edKeyPair = loaded.edKeyPair;
      this.initializedAt = loaded.generatedAt;
    } else {
      this.initializedAt = new Date().toISOString();
      // 1. Generate NIST ML-KEM-768
      this.kemKeys = ml_kem768.keygen();

      // 2. Generate NIST ML-DSA-65 with 32-byte seed
      const dsaSeed = crypto.randomBytes(32);
      this.dsaKeys = ml_dsa65.keygen(dsaSeed);

      // 3. Generate Classical Ed25519 for hybrid fallback
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
      const pubRaw = publicKey.export({ type: 'spki', format: 'der' });
      const edPubHex = pubRaw.subarray(pubRaw.length - 32).toString('hex');
      this.edKeyPair = { publicKey, privateKey, pubHex: edPubHex };

      // Persist to file for stability across gateway restarts
      this.saveKeys(dsaSeed);
    }
  }

  private tryLoadKeys(): {
    kemKeys: PQCKeyPair;
    dsaKeys: PQCKeyPair;
    edKeyPair: { publicKey: crypto.KeyObject; privateKey: crypto.KeyObject; pubHex: string };
    generatedAt: string;
  } | null {
    try {
      // QSEAL_KEYS_JSON (raw JSON or base64) lets hosts without a persistent disk keep stable keys.
      const fromEnv = process.env.QSEAL_KEYS_JSON?.trim();
      const raw = fromEnv
        ? (fromEnv.startsWith('{') ? fromEnv : Buffer.from(fromEnv, 'base64').toString('utf8'))
        : fs.existsSync(config.keysFilePath) ? fs.readFileSync(config.keysFilePath, 'utf8') : null;
      if (raw) {
        const data: StoredKeysSchema = JSON.parse(raw);

        const kemKeys: PQCKeyPair = {
          publicKey: new Uint8Array(Buffer.from(data.mlKemPublicKey, 'hex')),
          secretKey: new Uint8Array(Buffer.from(data.mlKemSecretKey, 'hex')),
        };

        let dsaKeys: PQCKeyPair;
        if (data.mlDsaSeed) {
          const seed = new Uint8Array(Buffer.from(data.mlDsaSeed, 'hex'));
          dsaKeys = ml_dsa65.keygen(seed);
        } else {
          dsaKeys = {
            publicKey: new Uint8Array(Buffer.from(data.mlDsaPublicKey, 'hex')),
            secretKey: new Uint8Array(Buffer.from(data.mlDsaSecretKey, 'hex')),
          };
        }

        const privateKey = crypto.createPrivateKey(data.ed25519PrivateKeyPem);
        const publicKey = crypto.createPublicKey(data.ed25519PublicKeyPem);

        return {
          kemKeys,
          dsaKeys,
          edKeyPair: { publicKey, privateKey, pubHex: data.ed25519PubHex },
          generatedAt: data.generatedAt,
        };
      }
    } catch (err) {
      // Silently rotating keys would invalidate every receipt already issued.
      if (config.isProduction) throw new Error(`[PQCManager] Stored signing keys are unreadable: ${(err as Error).message}`);
      console.warn('[PQCManager] Could not load stored keys, regenerating new keypair:', err);
    }
    return null;
  }

  private saveKeys(dsaSeed: Uint8Array) {
    try {
      const edPrivPem = this.edKeyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
      const edPubPem = this.edKeyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();

      const stored: StoredKeysSchema = {
        version: '1.0',
        generatedAt: this.initializedAt,
        mlKemPublicKey: Buffer.from(this.kemKeys.publicKey).toString('hex'),
        mlKemSecretKey: Buffer.from(this.kemKeys.secretKey).toString('hex'),
        mlDsaSeed: Buffer.from(dsaSeed).toString('hex'),
        mlDsaPublicKey: Buffer.from(this.dsaKeys.publicKey).toString('hex'),
        mlDsaSecretKey: Buffer.from(this.dsaKeys.secretKey).toString('hex'),
        ed25519PrivateKeyPem: edPrivPem,
        ed25519PublicKeyPem: edPubPem,
        ed25519PubHex: this.edKeyPair.pubHex,
      };

      fs.mkdirSync(path.dirname(config.keysFilePath), { recursive: true });
      // Secret key material: owner read/write only.
      fs.writeFileSync(config.keysFilePath, JSON.stringify(stored, null, 2), { encoding: 'utf8', mode: 0o600 });
      console.log(`[PQCManager] Stable PQC keys persisted to ${config.keysFilePath}`);
    } catch (err) {
      console.warn('[PQCManager] Could not write keys file:', err);
    }
  }

  public getPublicKeys(): GatewayPublicKeys {
    return {
      algorithm: 'ML-KEM-768 + ML-DSA-65 + Ed25519',
      mlKemPublicKey: Buffer.from(this.kemKeys.publicKey).toString('hex'),
      mlDsaPublicKey: Buffer.from(this.dsaKeys.publicKey).toString('hex'),
      ed25519PublicKey: this.edKeyPair.pubHex,
      generatedAt: this.initializedAt,
    };
  }

  public decapsulate(cipherTextHex: string): Uint8Array {
    const cipherText = Buffer.from(cipherTextHex, 'hex');
    return ml_kem768.decapsulate(cipherText, this.kemKeys.secretKey);
  }

  public encapsulate(recipientPublicKeyHex: string): { cipherTextHex: string; sharedSecret: Uint8Array } {
    const recipientPub = Buffer.from(recipientPublicKeyHex, 'hex');
    const { cipherText, sharedSecret } = ml_kem768.encapsulate(recipientPub);
    return {
      cipherTextHex: Buffer.from(cipherText).toString('hex'),
      sharedSecret,
    };
  }

  public sign(data: Uint8Array | string): HybridSignature {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    
    // NIST ML-DSA-65 signature
    const dsaSigBytes = ml_dsa65.sign(this.dsaKeys.secretKey, bytes);
    const mlDsaSignature = Buffer.from(dsaSigBytes).toString('hex');

    // Ed25519 signature
    const edSigBytes = crypto.sign(null, bytes, this.edKeyPair.privateKey);
    const ed25519Signature = edSigBytes.toString('hex');

    return {
      mlDsaSignature,
      ed25519Signature,
      algorithm: 'ML-DSA-65/Ed25519-Hybrid',
    };
  }

  public verify(data: Uint8Array | string, dsaSigHex: string, dsaPubHex?: string): boolean {
    try {
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const sig = Buffer.from(dsaSigHex, 'hex');
      const pub = dsaPubHex ? Buffer.from(dsaPubHex, 'hex') : this.dsaKeys.publicKey;
      return ml_dsa65.verify(pub, bytes, sig);
    } catch {
      return false;
    }
  }

  public verifyEd25519(data: Uint8Array | string, edSigHex: string, edPubHex?: string): boolean {
    try {
      const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      const sig = Buffer.from(edSigHex, 'hex');
      const pubKeyToUse = edPubHex || this.edKeyPair.pubHex;
      
      const spkiHeader = Buffer.from('302a300506032b6570032100', 'hex');
      const spkiKey = Buffer.concat([spkiHeader, Buffer.from(pubKeyToUse, 'hex')]);
      const keyObj = crypto.createPublicKey({ key: spkiKey, format: 'der', type: 'spki' });
      return crypto.verify(null, bytes, keyObj, sig);
    } catch {
      return false;
    }
  }
}

export const pqc = new PQCManager();
