import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const IV_BYTE_LENGTH = 16;
const CIPHER = "aes-256-cbc";

const PROVIDER_SECRET_VERSION = "v1";
const PROVIDER_SECRET_ALGORITHM = "aes-256-gcm";
const PROVIDER_SECRET_IV_BYTE_LENGTH = 12;
const PROVIDER_SECRET_AUTH_TAG_BYTE_LENGTH = 16;

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

/**
 * Encrypt provider API credentials before storing them in
 * provider_credentials.secret_ref.
 *
 * Format:
 *   v1:iv:authTag:ciphertext
 *
 * AES-256-GCM provides both confidentiality and integrity.
 */
export function encryptProviderSecret(secret: string): string {
  const iv = randomBytes(PROVIDER_SECRET_IV_BYTE_LENGTH);
  const cipher = createCipheriv(
    PROVIDER_SECRET_ALGORITHM,
    getEncryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    PROVIDER_SECRET_VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function isEncryptedProviderSecret(
  value: string | null | undefined
): boolean {
  return (
    typeof value === "string" &&
    value.startsWith(`${PROVIDER_SECRET_VERSION}:`)
  );
}

/**
 * Decrypt a provider secret stored in provider_credentials.secret_ref.
 *
 * Legacy plaintext values are returned unchanged so existing credentials
 * continue to work during the migration window. Callers should re-encrypt
 * them after a successful read.
 */
export function decryptProviderSecret(storedValue: string): string {
  if (!storedValue) {
    throw new Error("Provider credential is empty");
  }

  if (!isEncryptedProviderSecret(storedValue)) {
    return storedValue;
  }

  const parts = storedValue.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted provider secret format");
  }

  const [, ivBase64, authTagBase64, cipherBase64] = parts;

  if (!ivBase64 || !authTagBase64 || !cipherBase64) {
    throw new Error("Invalid encrypted provider secret format");
  }

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const ciphertext = Buffer.from(cipherBase64, "base64");

  if (iv.length !== PROVIDER_SECRET_IV_BYTE_LENGTH) {
    throw new Error("Invalid provider secret IV length");
  }

  if (authTag.length !== PROVIDER_SECRET_AUTH_TAG_BYTE_LENGTH) {
    throw new Error("Invalid provider secret authentication tag");
  }

  const decipher = createDecipheriv(
    PROVIDER_SECRET_ALGORITHM,
    getEncryptionKey(),
    iv
  );

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
