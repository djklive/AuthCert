require('dotenv').config();
const express = require('express');
const cors = require('cors');

const prisma = require('./config/prisma');
const supabaseStorage = require('./services/storageService');
const { cleanupExpiredSessions } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ===============================================
//                MONTAGE DES ROUTES
// Chaque routeur définit ses propres chemins absolus /api/...
// ===============================================
app.use(require('./routes/health.routes'));
app.use(require('./routes/auth.routes'));
app.use(require('./routes/users.routes'));
app.use(require('./routes/admin.routes'));
app.use(require('./routes/etablissements.routes'));
app.use(require('./routes/apprenants.routes'));
app.use(require('./routes/formations.routes'));
app.use(require('./routes/certificats.routes'));
app.use(require('./routes/notifications.routes'));
app.use(require('./routes/dashboard.routes'));
app.use(require('./routes/liaisons.routes'));
app.use(require('./routes/demandes.routes'));
app.use(require('./routes/uploads.routes'));
app.use(require('./routes/subscriptions.routes'));

// Initialiser Supabase Storage au démarrage
async function initializeSupabase() {
  try {
    const result = await supabaseStorage.ensureBucketExists();

    if (result.success) {
      console.log('✅ Supabase Storage initialisé');
    } else {
      console.error('❌ Erreur initialisation Supabase:', result.error);
    }
  } catch (error) {
    console.error('❌ Erreur initialisation Supabase:', error);
  }
}

// Nettoyage automatique des sessions expirées au démarrage
async function initializeServer() {
  try {
    console.log('🧹 Nettoyage des sessions expirées...');
    const cleanedCount = await cleanupExpiredSessions();
    console.log(`✅ ${cleanedCount} sessions expirées supprimées`);
  } catch (error) {
    console.error('❌ Erreur nettoyage sessions au démarrage:', error);
  }
}

// Démarrage du serveur (seulement si appelé directement)
if (require.main === module) {
  // Initialiser Supabase avant de démarrer le serveur
  initializeSupabase().then(async () => {
    app.listen(PORT, async () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📡 API disponible sur http://localhost:${PORT}/api`);
      console.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL || 'Non défini'}`);
      console.log(`☁️ Supabase Storage: ${process.env.SUPABASE_URL ? 'Configuré' : 'Non configuré'}`);

      // Nettoyer les sessions expirées au démarrage
      await initializeServer();

      // Nettoyer les sessions expirées toutes les heures
      setInterval(async () => {
        try {
          const cleanedCount = await cleanupExpiredSessions();
          if (cleanedCount > 0) {
            console.log(`🧹 Nettoyage automatique: ${cleanedCount} sessions expirées supprimées`);
          }
        } catch (error) {
          console.error('❌ Erreur nettoyage automatique:', error);
        }
      }, 60 * 60 * 1000); // Toutes les heures
    });
  });

  // Gestion de la fermeture
  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

// Export de l'app pour le fichier start.js
module.exports = app;
