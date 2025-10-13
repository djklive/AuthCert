// === Wallet encryption helpers (AES-256-GCM) ===
const crypto = require('crypto');

function getWalletEncryptionKey() {
    const raw = process.env.WALLET_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    if (!raw) {
      throw new Error('WALLET_ENCRYPTION_KEY manquant dans les variables d\'environnement');
    }
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      return Buffer.from(raw, 'hex');
    }
    return crypto.createHash('sha256').update(raw).digest();
}

function encryptPrivateKey(plainTextPrivateKey) {
    const key = getWalletEncryptionKey();
    const iv = crypto.randomBytes(12); // GCM IV 96-bit
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainTextPrivateKey, 'utf8'),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();
    return {
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      cipherText: encrypted.toString('base64')
    };
}
  
function decryptPrivateKey(encryptedObject) {
    const key = getWalletEncryptionKey();
    const iv = Buffer.from(encryptedObject.iv, 'base64');
    const authTag = Buffer.from(encryptedObject.authTag, 'base64');
    const cipherText = Buffer.from(encryptedObject.cipherText, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
    return decrypted.toString('utf8');
}

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = {
  encryptPrivateKey,
  decryptPrivateKey,
  sha256Hex
};