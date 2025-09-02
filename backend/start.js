#!/usr/bin/env node

// Fichier de démarrage spécifique pour Railway
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const app = require('./server');

const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

async function startServer() {
  try {
    // Tester la connexion à la base de données
    console.log('🔌 Test de connexion à la base de données...');
    await prisma.$connect();
    console.log('✅ Connexion à la base de données réussie');

    // Démarrer le serveur
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 Serveur démarré avec succès !');
      console.log(`📡 Port: ${PORT}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL ? 'Défini' : 'Non défini'}`);
      console.log(`🔐 JWT_SECRET: ${process.env.JWT_SECRET ? 'Défini' : 'Non défini'}`);
      console.log(`🌐 FRONTEND_URL: ${process.env.FRONTEND_URL || 'Non défini'}`);
    });

  } catch (error) {
    console.error('❌ Erreur au démarrage du serveur:', error);
    process.exit(1);
  }
}

// Gestion de la fermeture
process.on('SIGINT', async () => {
  console.log('🛑 Arrêt du serveur...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Arrêt du serveur (SIGTERM)...');
  await prisma.$disconnect();
  process.exit(0);
});

// Démarrer le serveur
startServer();
