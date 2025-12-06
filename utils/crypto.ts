/**
 * Generates a cryptographic key from a shared secret
 * using PBKDF2 for key derivation.
 */
export async function deriveKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("clipsync-salt-v2"), // Fixed salt for MVP simplicity
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(text: string, password: string): Promise<{ payload: string; iv: string }> {
  const key = await deriveKey(password);
  return encryptText(text, key);
}

export async function decryptData(encryptedBase64: string, ivBase64: string, password: string): Promise<string> {
  const key = await deriveKey(password);
  return decryptText(encryptedBase64, ivBase64, key);
}

export async function encryptText(text: string, key: CryptoKey): Promise<{ payload: string; iv: string }> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = enc.encode(text);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedText
  );

  return {
    payload: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}

export async function decryptText(encryptedBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
  const encryptedBuffer = base64ToBuffer(encryptedBase64);
  const iv = base64ToBuffer(ivBase64);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encryptedBuffer
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (e) {
    throw new Error("Decryption failed. Wrong password?");
  }
}

// Helpers
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}