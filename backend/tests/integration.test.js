// Test d'intégration pour vérifier que tous les modules fonctionnent ensemble
const { encryptPrivateKey, decryptPrivateKey, sha256Hex } = require('../src/utils/cryptoUtils');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

describe('Tests d\'intégration - Modules crypto', () => {
  
  it('devrait chiffrer et déchiffrer une clé privée avec succès', () => {
    const privateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    
    const encrypted = encryptPrivateKey(privateKey);
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('authTag');
    expect(encrypted).toHaveProperty('cipherText');
    
    const decrypted = decryptPrivateKey(encrypted);
    expect(decrypted).toBe(privateKey);
  });

  it('devrait générer des hashes SHA-256 cohérents', () => {
    const testData = Buffer.from('Test data for hashing');
    const hash1 = sha256Hex(testData);
    const hash2 = sha256Hex(testData);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 produit 64 caractères hex
  });

  it('devrait hasher des mots de passe avec bcrypt', async () => {
    const password = 'TestPassword123!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const isValid = await bcrypt.compare(password, hashedPassword);
    expect(isValid).toBe(true);
    
    const isInvalid = await bcrypt.compare('WrongPassword', hashedPassword);
    expect(isInvalid).toBe(false);
  });

  it('devrait utiliser crypto.randomBytes pour générer des IV uniques', () => {
    const iv1 = crypto.randomBytes(12);
    const iv2 = crypto.randomBytes(12);
    
    expect(iv1).not.toEqual(iv2);
    expect(iv1).toHaveLength(12);
    expect(iv2).toHaveLength(12);
  });

});
