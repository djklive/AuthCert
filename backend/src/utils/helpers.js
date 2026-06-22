const prisma = require('../config/prisma');

// Fonction utilitaire pour mapper les types d'établissement
function mapTypeEtablissement(typeString) {
  const typeMap = {
    'Université publique': 'UNIVERSITE_PUBLIQUE',
    'Université privée': 'UNIVERSITE_PRIVEE',
    'Institut supérieur': 'INSTITUT_SUPERIEUR',
    'École technique': 'ECOLE_TECHNIQUE',
    'Centre de formation': 'CENTRE_FORMATION',
    'Autre': 'AUTRE',
    // Support pour les valeurs déjà mappées
    'UNIVERSITE_PUBLIQUE': 'UNIVERSITE_PUBLIQUE',
    'UNIVERSITE_PRIVEE': 'UNIVERSITE_PRIVEE',
    'INSTITUT_SUPERIEUR': 'INSTITUT_SUPERIEUR',
    'ECOLE_TECHNIQUE': 'ECOLE_TECHNIQUE',
    'CENTRE_FORMATION': 'CENTRE_FORMATION',
    'AUTRE': 'AUTRE'
  };

  return typeMap[typeString] || 'AUTRE';
}

// Fonction helper pour calculer le temps écoulé
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return `Il y a ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Il y a ${days}j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Il y a ${months} mois`;
  return `Il y a ${Math.floor(months / 12)} an${Math.floor(months / 12) > 1 ? 's' : ''}`;
}

// Fonction helper pour créer une notification
async function createNotification({ userId, userType, type, titre, message, important = false, lienAction = null, metadonnees = null }) {
  try {
    // Mapper userType vers les IDs appropriés
    const data = {
      userId,
      userType,
      type,
      titre,
      message,
      important,
      lienAction,
      metadonnees: metadonnees || null  // ✅ Prisma Json type accepte directement un objet
    };

    // Ajouter l'ID approprié selon le userType
    if (userType === 'apprenant') {
      data.apprenantId = userId;
    } else if (userType === 'etablissement') {
      data.etablissementId = userId;
    } else if (userType === 'admin') {
      data.adminId = userId;
    }

    const notification = await prisma.notification.create({ data });
    console.log(`📬 Notification créée pour ${userType} ${userId}: ${titre}`);
    return notification;
  } catch (error) {
    console.error('❌ Erreur création notification:', error);
    console.error('📋 Détails de la notification échouée:', { userId, userType, type, titre });
    // Ne pas faire échouer l'opération principale si la notification échoue
    return null;
  }
}

module.exports = {
  mapTypeEtablissement,
  getTimeAgo,
  createNotification
};
