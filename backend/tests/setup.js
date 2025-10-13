// Configuration globale pour Jest
const crypto = require('crypto');

// S'assurer que crypto est disponible globalement
global.crypto = crypto;

// Configuration des variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.WALLET_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
