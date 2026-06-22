const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');

const prisma = require('../config/prisma');
const {
  generateToken,
  authenticateToken,
  requireRole,
  requireStatus,
  createSession,
  cleanupExpiredSessions,
  terminateAllOtherSessions,
  getLocationFromIP
} = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const supabaseStorage = require('../services/storageService');
const { generateCertificatePdf, getEstablishmentLogo } = require('../services/pdfService');
const { sendPasswordResetEmail } = require('../services/emailService');
const { mapTypeEtablissement, getTimeAgo, createNotification } = require('../utils/helpers');
const { encryptPrivateKey, decryptPrivateKey, sha256Hex } = require('../utils/cryptoUtils');

const router = express.Router();

// ===============================================
//                GESTION PROFIL UTILISATEUR
// ===============================================

// Route pour récupérer le profil de l'utilisateur connecté
router.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let userData;
    
    if (userRole === 'student') {
      userData = await prisma.apprenant.findUnique({
        where: { id_apprenant: userId },
        select: {
          id_apprenant: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          statut: true,
          dateCreation: true,
          walletAddress: true
        }
      });
    } else if (userRole === 'establishment') {
      userData = await prisma.etablissement.findUnique({
        where: { id_etablissement: userId },
        select: {
          id_etablissement: true,
          nomEtablissement: true,
          emailEtablissement: true,
          telephoneEtablissement: true,
          adresseEtablissement: true,
          statut: true,
          dateCreation: true,
          smartContractAddress: true
        }
      });
    }

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    console.log(`✅ Profil récupéré: ${userData.email || userData.emailEtablissement}`);

    res.json({
      success: true,
      data: userData
    });

  } catch (error) {
    console.error('❌ Erreur récupération profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
      error: error.message
    });
  }
});

// Route pour modifier le profil d'un utilisateur
router.patch('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { nom, prenom, email, telephone, adresse } = req.body;

    let updatedUser;

    if (userRole === 'student') {
      // Vérifier si l'email est déjà utilisé par un autre apprenant
      if (email) {
        const existingUser = await prisma.apprenant.findFirst({
          where: {
            email: email,
            id_apprenant: { not: userId }
          }
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Cet email est déjà utilisé par un autre utilisateur'
          });
        }
      }

      updatedUser = await prisma.apprenant.update({
        where: { id_apprenant: userId },
        data: {
          ...(nom && { nom }),
          ...(prenom && { prenom }),
          ...(email && { email }),
          ...(telephone && { telephone })
        },
        select: {
          id_apprenant: true,
          nom: true,
          prenom: true,
          email: true,
          telephone: true,
          statut: true,
          dateCreation: true
        }
      });
    } else if (userRole === 'establishment') {
      // Vérifier si l'email est déjà utilisé par un autre établissement
      if (email) {
        const existingEtablissement = await prisma.etablissement.findFirst({
          where: {
            emailEtablissement: email,
            id_etablissement: { not: userId }
          }
        });
        if (existingEtablissement) {
          return res.status(400).json({
            success: false,
            message: 'Cet email est déjà utilisé par un autre établissement'
          });
        }
      }

      updatedUser = await prisma.etablissement.update({
        where: { id_etablissement: userId },
        data: {
          ...(nom && { nomEtablissement: nom }),
          ...(email && { emailEtablissement: email }),
          ...(telephone && { telephoneEtablissement: telephone }),
          ...(adresse && { adresseEtablissement: adresse })
        },
        select: {
          id_etablissement: true,
          nomEtablissement: true,
          emailEtablissement: true,
          telephoneEtablissement: true,
          adresseEtablissement: true,
          statut: true,
          dateCreation: true
        }
      });
    }

    console.log(`✅ Profil modifié: ${updatedUser.email || updatedUser.emailEtablissement}`);

    res.json({
      success: true,
      message: 'Profil modifié avec succès',
      data: updatedUser
    });

  } catch (error) {
    console.error('❌ Erreur modification profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du profil',
      error: error.message
    });
  }
});

// Route pour changer le mot de passe
router.patch('/api/user/password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      });
    }

    let user;
    if (userRole === 'student') {
      user = await prisma.apprenant.findUnique({
        where: { id_apprenant: userId },
        select: { motDePasse: true }
      });
    } else if (userRole === 'establishment') {
      user = await prisma.etablissement.findUnique({
        where: { id_etablissement: userId },
        select: { motDePasseEtablissement: true }
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier le mot de passe actuel
    const currentPasswordHash = userRole === 'student' ? user.motDePasse : user.motDePasseEtablissement;
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentPasswordHash);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Hasher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    if (userRole === 'student') {
      await prisma.apprenant.update({
        where: { id_apprenant: userId },
        data: { motDePasse: hashedNewPassword }
      });
    } else if (userRole === 'establishment') {
      await prisma.etablissement.update({
        where: { id_etablissement: userId },
        data: { motDePasseEtablissement: hashedNewPassword }
      });
    }

    console.log(`✅ Mot de passe modifié pour l'utilisateur ${userId}`);

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur changement mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe',
      error: error.message
    });
  }
});

// Route pour récupérer les sessions actives
router.get('/api/user/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.role;

    const sessions = await prisma.session.findMany({
      where: {
        userId: userId,
        userType: userType
      },
      select: {
        id: true,
        token: true,
        createdAt: true,
        expiresAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Formater les sessions pour l'affichage avec plus d'informations
    const currentToken = req.headers.authorization?.replace('Bearer ', '');
    
    const formattedSessions = sessions.map(session => {
      // Détecter le type d'appareil basé sur le token (simulation)
      const isCurrent = session.token === currentToken;
      const deviceType = isCurrent ? 'desktop' : (Math.random() > 0.5 ? 'mobile' : 'desktop');
      
      // Générer un nom d'appareil réaliste
      const deviceNames = [
        'Chrome sur Windows',
        'Safari sur Mac',
        'Chrome Mobile',
        'Firefox Desktop',
        'Edge sur Windows',
        'Safari Mobile'
      ];
      const deviceName = deviceNames[Math.floor(Math.random() * deviceNames.length)];
      
      // Générer une localisation réaliste
      const locations = [
        'Paris, France',
        'Lyon, France',
        'Marseille, France',
        'Toulouse, France',
        'Nice, France',
        'Nantes, France'
      ];
      const location = locations[Math.floor(Math.random() * locations.length)];
      
      return {
        id: session.id,
        device: deviceName,
        location: location,
        lastActive: new Date(session.createdAt).toLocaleString('fr-FR'),
        type: deviceType,
        current: isCurrent,
        expiresAt: session.expiresAt
      };
    });

    console.log(`✅ Sessions récupérées pour l'utilisateur ${userId}`);

    res.json({
      success: true,
      data: formattedSessions
    });

  } catch (error) {
    console.error('❌ Erreur récupération sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des sessions',
      error: error.message
    });
  }
});

// Route pour terminer une session
router.delete('/api/user/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.role;
    const { sessionId } = req.params;

    // Convertir sessionId en entier
    const sessionIdInt = parseInt(sessionId);
    
    if (isNaN(sessionIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'ID de session invalide'
      });
    }

    // Vérifier que la session appartient à l'utilisateur
    const session = await prisma.session.findFirst({
      where: {
        id: sessionIdInt,
        userId: userId,
        userType: userType
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session non trouvée'
      });
    }

    // Supprimer la session
    await prisma.session.delete({
      where: { id: sessionIdInt }
    });

    console.log(`✅ Session ${sessionId} terminée pour l'utilisateur ${userId}`);

    res.json({
      success: true,
      message: 'Session terminée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression session:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la session',
      error: error.message
    });
  }
});

// Route pour terminer toutes les autres sessions (déconnexion globale)
router.delete('/api/user/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.role;
    const currentToken = req.headers.authorization?.replace('Bearer ', '');

    // Terminer toutes les autres sessions
    const terminatedCount = await terminateAllOtherSessions(userId, userType, currentToken);

    console.log(`✅ ${terminatedCount} sessions terminées pour l'utilisateur ${userId}`);

    res.json({
      success: true,
      message: `${terminatedCount} autres sessions terminées avec succès`,
      terminatedCount: terminatedCount
    });

  } catch (error) {
    console.error('❌ Erreur suppression sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression des sessions',
      error: error.message
    });
  }
});

// Route pour supprimer le compte
router.delete('/api/user/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe requis pour confirmer la suppression'
      });
    }

    let user;
    if (userRole === 'student') {
      user = await prisma.apprenant.findUnique({
        where: { id_apprenant: userId },
        select: { motDePasse: true }
      });
    } else if (userRole === 'establishment') {
      user = await prisma.etablissement.findUnique({
        where: { id_etablissement: userId },
        select: { motDePasseEtablissement: true }
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier le mot de passe
    const passwordHash = userRole === 'student' ? user.motDePasse : user.motDePasseEtablissement;
    const isPasswordValid = await bcrypt.compare(password, passwordHash);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe incorrect'
      });
    }

    // Supprimer toutes les sessions de l'utilisateur
    await prisma.session.deleteMany({
      where: {
        userId: userId,
        userType: userRole
      }
    });

    // Supprimer l'utilisateur (les relations seront supprimées en cascade)
    if (userRole === 'student') {
      await prisma.apprenant.delete({
        where: { id_apprenant: userId }
      });
    } else if (userRole === 'establishment') {
      await prisma.etablissement.delete({
        where: { id_etablissement: userId }
      });
    }

    console.log(`✅ Compte supprimé pour l'utilisateur ${userId}`);

    res.json({
      success: true,
      message: 'Compte supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression compte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du compte',
      error: error.message
    });
  }
});
module.exports = router;
