import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const IV_BYTE_LENGTH = 16;
const CIPHER = "aes-256-cbc";

function getEncryptionKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;

  if (!secret) {
    throw new Error("Missing API_KEY_ENCRYPTION_SECRET");
  }

  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) {
    throw new Error(
      "API_KEY_ENCRYPTION_SECRET must be a base64-encoded 32-byte key"
    );
  }

  return key;
}

export function encryptApiKey(apiKey: string): string {
  const iv = randomBytes(IV_BYTE_LENGTH);
  const cipher = createCipheriv(CIPHER, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);

  // Persist as iv:ciphertext in base64 for simple storage/retrieval.
  return `${iv.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptApiKey(encryptedValue: string): string {
  const [ivBase64, cipherBase64] = encryptedValue.split(":");
  if (!ivBase64 || !cipherBase64) {
    throw new Error("Invalid encrypted API key format");
  }

  const iv = Buffer.from(ivBase64, "base64");
  if (iv.length !== IV_BYTE_LENGTH) {
    throw new Error("Invalid IV length");
  }

  const decipher = createDecipheriv(CIPHER, getEncryptionKey(), iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherBase64, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
