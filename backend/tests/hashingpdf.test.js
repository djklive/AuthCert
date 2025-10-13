// Fichier: /tests/hashingpdf.test.js
const { sha256Hex } = require('../utils/cryptoUtils'); 
const dotenv = require('dotenv');
dotenv.config();

describe('Génération de Hash de Document', () => {
  it('devrait produire un hash SHA-256 correct et constant pour une même entrée', () => {
    const buffer = Buffer.from("Bonjour le monde");
    const hash = sha256Hex(buffer);
    const expectedHash = "4dc45b5ed3de202a5693c926caf95bd9710bef4fe5fb16a1c24a08ed428e8ae0";
    
    expect(hash).toBe(expectedHash);
  });
});