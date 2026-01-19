// Client-side secure encryption for the wallet mnemonic seed phrase using Web Crypto API (AES-GCM)

// Helper to convert array buffer to hex string
function bufToHex(buffer: ArrayBuffer): string {
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

// Helper to convert hex string to array buffer
function hexToBuf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

// Derive AES key from password and salt
async function deriveKey(password: string, saltBuf: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuf,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext with password
export async function encryptText(text: string, password: string): Promise<{ encryptedHex: string; ivHex: string; saltHex: string }> {
  const enc = new TextEncoder();
  const saltBuf = window.crypto.getRandomValues(new Uint8Array(16));
  const ivBuf = window.crypto.getRandomValues(new Uint8Array(12));
  
  const key = await deriveKey(password, saltBuf);
  
  const encryptedBuf = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBuf
    },
    key,
    enc.encode(text)
  );

  return {
    encryptedHex: bufToHex(encryptedBuf),
    ivHex: bufToHex(ivBuf.buffer),
    saltHex: bufToHex(saltBuf.buffer)
  };
}

// Decrypt ciphertext with password
export async function decryptText(encryptedHex: string, ivHex: string, saltHex: string, password: string): Promise<string> {
  try {
    const saltBuf = new Uint8Array(hexToBuf(saltHex));
    const ivBuf = new Uint8Array(hexToBuf(ivHex));
    const encryptedBuf = hexToBuf(encryptedHex);
    
    const key = await deriveKey(password, saltBuf);
    
    const decryptedBuf = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuf
      },
      key,
      encryptedBuf
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuf);
  } catch (e) {
    throw new Error('Incorrect password');
  }
}

// Wallet LocalStorage wrappers
const STORAGE_KEYS = {
  ENCRYPTED_MNEMONIC: 'backpack_encrypted_mnemonic',
  IV: 'backpack_iv',
  SALT: 'backpack_salt',
  PASSWORD_HASH: 'backpack_password_hash', // SHA-256 hash of password for simple verification
  ACCOUNTS_COUNT: 'backpack_accounts_count',
  ACTIVE_NETWORK: 'backpack_active_network',
  USERNAME: 'backpack_username',
  ACCOUNT_NAMES: 'backpack_account_names'
};

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const hashBuf = await window.crypto.subtle.digest('SHA-256', enc.encode(password));
  return bufToHex(hashBuf);
}

export async function setupWallet(mnemonic: string, password: string, username?: string): Promise<void> {
  const { encryptedHex, ivHex, saltHex } = await encryptText(mnemonic, password);
  const pHash = await hashPassword(password);
  
  localStorage.setItem(STORAGE_KEYS.ENCRYPTED_MNEMONIC, encryptedHex);
  localStorage.setItem(STORAGE_KEYS.IV, ivHex);
  localStorage.setItem(STORAGE_KEYS.SALT, saltHex);
  localStorage.setItem(STORAGE_KEYS.PASSWORD_HASH, pHash);
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS_COUNT, '1');
  localStorage.setItem(STORAGE_KEYS.ACTIVE_NETWORK, 'solana-devnet');
  
  if (username) {
    const cleanUsername = username.trim();
    localStorage.setItem(STORAGE_KEYS.USERNAME, cleanUsername);
    localStorage.setItem(STORAGE_KEYS.ACCOUNT_NAMES, JSON.stringify({ 0: cleanUsername }));
  }
}

export function isWalletSetup(): boolean {
  return localStorage.getItem(STORAGE_KEYS.ENCRYPTED_MNEMONIC) !== null;
}

export async function verifyPassword(password: string): Promise<boolean> {
  const storedHash = localStorage.getItem(STORAGE_KEYS.PASSWORD_HASH);
  if (!storedHash) return false;
  const hash = await hashPassword(password);
  return hash === storedHash;
}

export async function getMnemonic(password: string): Promise<string> {
  const encryptedHex = localStorage.getItem(STORAGE_KEYS.ENCRYPTED_MNEMONIC);
  const ivHex = localStorage.getItem(STORAGE_KEYS.IV);
  const saltHex = localStorage.getItem(STORAGE_KEYS.SALT);
  
  if (!encryptedHex || !ivHex || !saltHex) {
    throw new Error('Wallet not set up');
  }

  return decryptText(encryptedHex, ivHex, saltHex, password);
}

export function getAccountsCount(): number {
  return parseInt(localStorage.getItem(STORAGE_KEYS.ACCOUNTS_COUNT) || '1', 10);
}

export function setAccountsCount(count: number): void {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS_COUNT, count.toString());
}

export function getStoredNetwork(): string {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_NETWORK) || 'solana-devnet';
}

export function setStoredNetwork(network: string): void {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_NETWORK, network);
}

export function getStoredUsername(): string {
  return localStorage.getItem(STORAGE_KEYS.USERNAME) || '';
}

export function setStoredUsername(username: string): void {
  localStorage.setItem(STORAGE_KEYS.USERNAME, username.trim());
}

export function getStoredAccountNames(): Record<number, string> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACCOUNT_NAMES);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function setStoredAccountNames(names: Record<number, string>): void {
  localStorage.setItem(STORAGE_KEYS.ACCOUNT_NAMES, JSON.stringify(names));
}

export function clearWallet(): void {
  localStorage.removeItem(STORAGE_KEYS.ENCRYPTED_MNEMONIC);
  localStorage.removeItem(STORAGE_KEYS.IV);
  localStorage.removeItem(STORAGE_KEYS.SALT);
  localStorage.removeItem(STORAGE_KEYS.PASSWORD_HASH);
  localStorage.removeItem(STORAGE_KEYS.ACCOUNTS_COUNT);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_NETWORK);
  localStorage.removeItem(STORAGE_KEYS.USERNAME);
  localStorage.removeItem(STORAGE_KEYS.ACCOUNT_NAMES);
}
