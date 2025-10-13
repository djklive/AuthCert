// Fichier: /tests/crypto.test.js

const { encryptPrivateKey, decryptPrivateKey } = require('../utils/cryptoUtils');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

describe('Chiffrement et Déchiffrement des Clés Privées', () => {

  it('devrait chiffrer puis déchiffrer une clé privée pour retrouver la valeur originale', () => {
    // 1. Définir une clé privée de test (similaire à une vraie clé ethers.js)
    const originalPrivateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    // 2. Chiffrer la clé
    const encryptedData = encryptPrivateKey(originalPrivateKey);

    // Assertions sur l'objet chiffré
    expect(encryptedData).toBeDefined();
    expect(encryptedData).toHaveProperty('iv');
    expect(encryptedData).toHaveProperty('authTag');
    expect(encryptedData).toHaveProperty('cipherText');

    // 3. Déchiffrer la clé
    const decryptedPrivateKey = decryptPrivateKey(encryptedData);

    // 4. Vérifier que la clé déchiffrée est identique à l'originale
    expect(decryptedPrivateKey).toBe(originalPrivateKey);
  });

});