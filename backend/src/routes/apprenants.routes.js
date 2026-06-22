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

// Route d'inscription d'un apprenant
router.post('/api/register/apprenant', async (req, res) => {
  try {
    const { email, motDePasse, nom, prenom, telephone, etablissements } = req.body;

    // Validation des champs requis
    if (!email || !motDePasse || !nom || !prenom || !etablissements || etablissements.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis, y compris au moins un établissement'
      });
    }

    // Vérification si l'email existe déjà
    const existingApprenant = await prisma.apprenant.findUnique({
      where: { email }
    });

    if (existingApprenant) {
      return res.status(409).json({
        success: false,
        message: 'Un compte avec cet email existe déjà'
      });
    }

    // Hashage du mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(motDePasse, salt);

    // Génération d'un wallet pour l'apprenant + chiffrement de la clé privée
    let apprenant;
    try {
      const wallet = ethers.Wallet.createRandom();
      const enc = encryptPrivateKey(wallet.privateKey);

      // Création de l'apprenant avec l'adresse publique
      apprenant = await prisma.apprenant.create({
        data: {
          email,
          motDePasse: hashedPassword,
          nom,
          prenom,
          telephone: telephone || null,
          statut: 'ACTIF',
          dateCreation: new Date(),
          dateModification: new Date(),
          walletAddress: wallet.address
        }
      });

      // Stocker la clé privée chiffrée dans le coffre-fort
      await prisma.walletVault.create({
        data: {
          ownerType: 'apprenant',
          ownerId: apprenant.id_apprenant,
          iv: enc.iv,
          authTag: enc.authTag,
          cipherText: enc.cipherText
        }
      });
    } catch (e) {
      console.error('Erreur création wallet apprenant:', e);
      return res.status(500).json({ success: false, message: 'Erreur création du portefeuille' });
    }

    // Créer les demandes de liaison pour chaque établissement sélectionné
    const demandesLiaison = [];
    for (const nomEtablissement of etablissements) {
      // Trouver l'établissement par son nom
      const etablissement = await prisma.etablissement.findFirst({
        where: { 
          nomEtablissement: nomEtablissement,
          statut: 'ACTIF'
        }
      });

      if (etablissement) {
        // Créer une demande de liaison automatique
        const liaison = await prisma.liaisonApprenantEtablissement.create({
          data: {
            apprenantId: apprenant.id_apprenant,
            etablissementId: etablissement.id_etablissement,
            messageDemande: `Demande automatique lors de l'inscription`,
            statutLiaison: 'EN_ATTENTE'
          }
        });
        demandesLiaison.push(liaison);

        // Créer une notification pour l'établissement
        await createNotification({
          userId: etablissement.id_etablissement,
          userType: 'etablissement',
          type: 'DEMANDE_LIAISON_APPRENANT',
          titre: 'Nouvelle demande de liaison',
          message: `${prenom} ${nom} souhaite se lier à votre établissement`,
          important: true,
          lienAction: '/dashboard?userType=establishment',
          metadonnees: { liaisonId: liaison.id, apprenantId: apprenant.id_apprenant }
        });
      }
    }

    // Suppression du mot de passe de la réponse
    const { motDePasse: _, ...apprenantSansMotDePasse } = apprenant;

    console.log(`✅ Apprenant créé: ${apprenant.email} avec ${demandesLiaison.length} demandes de liaison`);

    res.status(201).json({
      success: true,
      message: `Compte apprenant créé avec succès. ${demandesLiaison.length} demande(s) de liaison envoyée(s) aux établissements.`,
      data: {
        apprenant: apprenantSansMotDePasse,
        demandesLiaison: demandesLiaison.length
      }
    });

  } catch (error) {
    console.error('Erreur inscription apprenant:', error);
    console.error('Détails de l\'erreur:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du compte',
      error: error.message
    });
  }
});

// Route pour récupérer les liaisons d'un apprenant
router.get('/api/apprenant/liaisons', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.role;

    console.log(`🔍 Récupération des liaisons pour l'apprenant ${userId}`);

    // Vérifier que l'utilisateur est un apprenant
    if (userType !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les apprenants peuvent accéder à leurs liaisons'
      });
    }

    const liaisons = await prisma.liaisonApprenantEtablissement.findMany({
      where: { apprenantId: userId },
      include: {
        etablissement: {
          select: {
            id_etablissement: true,
            nomEtablissement: true,
            typeEtablissement: true,
            adresseEtablissement: true,
            telephoneEtablissement: true,
            emailEtablissement: true
          }
        }
      },
      orderBy: { dateDemande: 'desc' }
    });

    console.log(`✅ ${liaisons.length} liaisons trouvées`);

    res.json({
      success: true,
      data: liaisons
    });

  } catch (error) {
    console.error('❌ Erreur récupération liaisons apprenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des liaisons',
      error: error.message
    });
  }
});
module.exports = router;
