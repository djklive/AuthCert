// Fichier: /tests/hashing.test.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

describe('Hachage et Vérification de Mots de Passe', () => {
  it('devrait retourner true quand on compare un mot de passe correct avec son hash', async () => {
    const password = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const isMatch = await bcrypt.compare(password, hashedPassword);
    expect(isMatch).toBe(true);
  });

  it('devrait retourner false pour un mot de passe incorrect', async () => {
    const password = 'Password123!';
    const wrongPassword = 'Password321!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const isMatch = await bcrypt.compare(wrongPassword, hashedPassword);
    expect(isMatch).toBe(false);
  });
});