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

// Route pour vérifier la validité du token
router.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Token valide',
      user: req.user
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token invalide'
    });
  }
});

// Route de connexion pour tous les utilisateurs
router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }

    // Auto-détection administrateur : si l'email correspond à un compte de la
    // table Admin, on traite la connexion comme une connexion admin, quel que
    // soit le rôle choisi dans le sélecteur (l'option "admin" n'est pas exposée
    // côté UI). Mot de passe vérifié via bcrypt.
    const admin = await prisma.admin.findFirst({ where: { email } });
    if (admin) {
      if (!bcrypt.compareSync(password, admin.motDePasse)) {
        return res.status(401).json({
          success: false,
          message: 'Identifiants administrateur incorrects'
        });
      }

      if (admin.statut && admin.statut !== 'ACTIF') {
        return res.status(403).json({
          success: false,
          message: 'Votre compte administrateur n\'est pas actif.'
        });
      }

      const userData = {
        id: admin.id_admin,
        email: admin.email,
        role: 'admin',
        nom: admin.nom,
        prenom: admin.prenom
      };

      const token = generateToken(userData);

      try {
        await createSession(admin.id_admin, 'admin', token, req);
      } catch (sessionError) {
        console.error('❌ Erreur création session admin:', sessionError);
        // On continue même si la session échoue
      }

      return res.json({
        success: true,
        user: userData,
        token: token
      });
    }

    // Connexion établissement
    if (role === 'establishment') {
      const etablissement = await prisma.etablissement.findFirst({
        where: { emailEtablissement: email }
      });

      if (!etablissement) {
        return res.status(401).json({
          success: false,
          message: 'Aucun établissement trouvé avec cet email'
        });
      }

      // Vérifier le mot de passe (en production, utiliser bcrypt.compare)
      if (!bcrypt.compareSync(password, etablissement.motDePasseEtablissement)) {
        return res.status(401).json({
          success: false,
          message: 'Mot de passe incorrect'
        });
      }

      // Vérifier le statut
      if (etablissement.statut === 'EN_ATTENTE') {
        return res.status(403).json({
          success: false,
          message: 'Votre demande d\'inscription est en cours de traitement. Veuillez patienter 48-72h.',
          status: 'EN_ATTENTE'
        });
      }

      if (etablissement.statut === 'REJETE') {
        return res.status(403).json({
          success: false,
          message: 'Votre demande d\'inscription a été refusée. Impossible de se connecter.',
          status: 'REJETE'
        });
      }

      if (etablissement.statut === 'SUSPENDU') {
        return res.status(403).json({
          success: false,
          message: 'Votre compte a été suspendu. Contactez l\'administration pour plus d\'informations.',
          status: 'SUSPENDU'
        });
      }

      // Vérifier si le statut est valide pour la connexion
      if (etablissement.statut !== 'ACTIF') {
        return res.status(403).json({
          success: false,
          message: 'Votre compte n\'est pas actif. Contactez l\'administration.',
          status: etablissement.statut
        });
      }

                 // Statut ACTIF - connexion autorisée
           if (etablissement.statut === 'ACTIF') {
             const userData = {
               id: etablissement.id_etablissement,
               email: etablissement.emailEtablissement,
               role: 'establishment',
               nom: etablissement.nomEtablissement,
               statut: etablissement.statut
             };
             
             const token = generateToken(userData);
             
             // Créer une session pour l'établissement
             try {
               await createSession(etablissement.id_etablissement, 'establishment', token, req);
             } catch (sessionError) {
               console.error('❌ Erreur création session établissement:', sessionError);
               // On continue même si la session échoue
             }
             
             return res.json({
               success: true,
               user: userData,
               token: token
             });
           }
    }

    // Connexion apprenant
    if (role === 'student') {
      const apprenant = await prisma.apprenant.findFirst({
        where: { email: email }
      });

      if (!apprenant) {
        return res.status(401).json({
          success: false,
          message: 'Aucun apprenant trouvé avec cet email'
        });
      }

      // Vérifier le mot de passe (en production, utiliser bcrypt.compare)
      if (!bcrypt.compareSync(password, apprenant.motDePasse)) {
        return res.status(401).json({
          success: false,
          message: 'Mot de passe incorrect'
        });
      }

             // Connexion autorisée
       const userData = {
         id: apprenant.id_apprenant,
         email: apprenant.email,
         role: 'student',
         nom: apprenant.nom,
         prenom: apprenant.prenom
       };
       
       const token = generateToken(userData);
       
       // Créer une session pour l'apprenant
       try {
         await createSession(apprenant.id_apprenant, 'student', token, req);
       } catch (sessionError) {
         console.error('❌ Erreur création session apprenant:', sessionError);
         // On continue même si la session échoue
       }
       
       return res.json({
         success: true,
         user: userData,
         token: token
       });
    }

    return res.status(400).json({
      success: false,
      message: 'Rôle invalide'
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      error: error.message
    });
  }
});

// ===============================================
//     RÉCUPÉRATION DE MOT DE PASSE
// ===============================================

// Route pour demander la réinitialisation du mot de passe
router.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Email et type d\'utilisateur requis'
      });
    }

    // Valider le type d'utilisateur
    const validUserTypes = ['student', 'establishment', 'admin'];
    if (!validUserTypes.includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Type d\'utilisateur invalide'
      });
    }

    // Mapper le type d'utilisateur au type de base de données
    const userTypeMap = {
      'student': 'apprenant',
      'establishment': 'etablissement',
      'admin': 'admin'
    };
    const dbUserType = userTypeMap[userType];

    // Vérifier si l'utilisateur existe
    let userExists = false;
    if (dbUserType === 'apprenant') {
      const apprenant = await prisma.apprenant.findFirst({ where: { email } });
      userExists = !!apprenant;
    } else if (dbUserType === 'etablissement') {
      const etablissement = await prisma.etablissement.findFirst({ where: { emailEtablissement: email } });
      userExists = !!etablissement;
    } else if (dbUserType === 'admin') {
      const admin = await prisma.admin.findFirst({ where: { email } });
      userExists = !!admin;
    }

    // Toujours retourner un succès pour ne pas révéler si l'email existe (sécurité)
    if (!userExists) {
      console.log(`⚠️ Tentative de réinitialisation pour email inexistant: ${email}`);
      return res.json({
        success: true,
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
      });
    }

    // Générer un token sécurisé (32 bytes = 64 caractères hex)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 heure

    // Invalider tous les anciens tokens non utilisés pour cet email
    await prisma.passwordReset.updateMany({
      where: {
        email,
        userType: dbUserType,
        used: false
      },
      data: {
        used: true,
        usedAt: new Date()
      }
    });

    // Créer un nouveau token de réinitialisation
    await prisma.passwordReset.create({
      data: {
        email,
        userType: dbUserType,
        token,
        expiresAt,
        ipAddress: req.ip || req.connection.remoteAddress || null
      }
    });

    // Générer le lien de réinitialisation
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    
    console.log('📧 Lien de réinitialisation:', resetLink);
    console.log(`✅ Token de réinitialisation créé pour ${email} (expire dans 1h)`);

    // Envoyer l'email de réinitialisation
    if (process.env.NODE_ENV === 'production') {
      try {
        const emailResult = await sendPasswordResetEmail(email, resetLink);
        if (emailResult.success) {
          console.log('✅ Email de réinitialisation envoyé avec succès');
        } else {
          console.error('⚠️ Erreur envoi email, mais token créé en base:', emailResult.error);
        }
      } catch (emailError) {
        console.error('⚠️ Exception envoi email:', emailError);
        // On continue même si l'email échoue (le token est créé)
      }
    }

    res.json({
      success: true,
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
      // En développement, retourner le lien pour faciliter les tests
      ...(process.env.NODE_ENV === 'development' && { resetLink })
    });

  } catch (error) {
    console.error('❌ Erreur demande réinitialisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la demande de réinitialisation',
      error: error.message
    });
  }
});

// Route pour réinitialiser le mot de passe avec le token
router.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token et nouveau mot de passe requis'
      });
    }

    // Valider la longueur du mot de passe
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Récupérer le token de réinitialisation
    const resetToken = await prisma.passwordReset.findUnique({
      where: { token }
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }

    // Vérifier si le token est déjà utilisé
    if (resetToken.used) {
      return res.status(400).json({
        success: false,
        message: 'Ce lien a déjà été utilisé'
      });
    }

    // Vérifier si le token est expiré
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Ce lien a expiré. Demandez un nouveau lien de réinitialisation'
      });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Mettre à jour le mot de passe selon le type d'utilisateur
    if (resetToken.userType === 'apprenant') {
      await prisma.apprenant.updateMany({
        where: { email: resetToken.email },
        data: { motDePasse: hashedPassword }
      });
    } else if (resetToken.userType === 'etablissement') {
      await prisma.etablissement.updateMany({
        where: { emailEtablissement: resetToken.email },
        data: { motDePasseEtablissement: hashedPassword }
      });
    } else if (resetToken.userType === 'admin') {
      await prisma.admin.updateMany({
        where: { email: resetToken.email },
        data: { motDePasse: hashedPassword }
      });
    }

    // Marquer le token comme utilisé
    await prisma.passwordReset.update({
      where: { id: resetToken.id },
      data: {
        used: true,
        usedAt: new Date()
      }
    });

    // Invalider toutes les sessions actives pour cet utilisateur (sécurité)
    await prisma.session.deleteMany({
      where: {
        userId: resetToken.userType === 'apprenant' 
          ? (await prisma.apprenant.findFirst({ where: { email: resetToken.email } }))?.id_apprenant
          : resetToken.userType === 'etablissement'
          ? (await prisma.etablissement.findFirst({ where: { emailEtablissement: resetToken.email } }))?.id_etablissement
          : (await prisma.admin.findFirst({ where: { email: resetToken.email } }))?.id_admin,
        userType: resetToken.userType
      }
    });

    console.log(`✅ Mot de passe réinitialisé pour ${resetToken.email}`);

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.'
    });

  } catch (error) {
    console.error('❌ Erreur réinitialisation mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation du mot de passe',
      error: error.message
    });
  }
});

// Route pour vérifier la validité d'un token
router.get('/api/auth/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const resetToken = await prisma.passwordReset.findUnique({
      where: { token }
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Token invalide'
      });
    }

    if (resetToken.used) {
      return res.status(400).json({
        success: false,
        message: 'Ce lien a déjà été utilisé'
      });
    }

    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'Ce lien a expiré'
      });
    }

    res.json({
      success: true,
      message: 'Token valide',
      data: {
        email: resetToken.email,
        userType: resetToken.userType
      }
    });

  } catch (error) {
    console.error('❌ Erreur vérification token:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du token',
      error: error.message
    });
  }
});
module.exports = router;
