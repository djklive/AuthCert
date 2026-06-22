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
const subscriptionService = require('../services/subscriptionService');

const router = express.Router();

// ========================================
// ROUTES POUR LA GESTION DES LIAISONS APPRENANT-ÉTABLISSEMENT
// ========================================

// Route pour créer une demande de liaison (apprenant vers établissement)
router.post('/api/liaison/demande', authenticateToken, async (req, res) => {
  try {
    const { etablissementId, messageDemande } = req.body;
    const userId = req.user.id;
    const userType = req.user.role;

    console.log(`🔗 Demande de liaison: Apprenant ${userId} -> Établissement ${etablissementId}`);

    // Vérifier que l'utilisateur est un apprenant
    if (userType !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les apprenants peuvent faire des demandes de liaison'
      });
    }

    // Vérifier que l'établissement existe et est actif
    const etablissement = await prisma.etablissement.findUnique({
      where: { id_etablissement: parseInt(etablissementId) }
    });

    if (!etablissement) {
      return res.status(404).json({
        success: false,
        message: 'Établissement non trouvé'
      });
    }

    if (etablissement.statut !== 'ACTIF') {
      return res.status(400).json({
        success: false,
        message: 'Cet établissement n\'accepte pas de nouvelles demandes'
      });
    }

    // Vérifier qu'il n'y a pas déjà une demande en cours
    const existingLiaison = await prisma.liaisonApprenantEtablissement.findUnique({
      where: {
        apprenantId_etablissementId: {
          apprenantId: userId,
          etablissementId: parseInt(etablissementId)
        }
      }
    });

    if (existingLiaison) {
      return res.status(409).json({
        success: false,
        message: 'Une demande de liaison existe déjà avec cet établissement',
        statut: existingLiaison.statutLiaison
      });
    }

    // Créer la demande de liaison
    const liaison = await prisma.liaisonApprenantEtablissement.create({
      data: {
        apprenantId: userId,
        etablissementId: parseInt(etablissementId),
        messageDemande: messageDemande || null,
        statutLiaison: 'EN_ATTENTE'
      },
      include: {
        apprenant: {
          select: {
            nom: true,
            prenom: true,
            email: true
          }
        },
        etablissement: {
          select: {
            nomEtablissement: true,
            emailEtablissement: true
          }
        }
      }
    });

    console.log(`✅ Demande de liaison créée: ${liaison.id}`);

    // Créer une notification pour l'établissement
    await createNotification({
      userId: parseInt(etablissementId),
      userType: 'etablissement',
      type: 'DEMANDE_LIAISON_APPRENANT',
      titre: 'Nouvelle demande de liaison',
      message: `${liaison.apprenant.prenom} ${liaison.apprenant.nom} souhaite se lier à votre établissement`,
      important: true,
      lienAction: '/dashboard?userType=establishment',
      metadonnees: { liaisonId: liaison.id, apprenantId: userId }
    });

    res.status(201).json({
      success: true,
      message: 'Demande de liaison envoyée avec succès',
      data: liaison
    });

  } catch (error) {
    console.error('❌ Erreur création demande liaison:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la demande',
      error: error.message
    });
  }
});

// Route pour approuver/rejeter une demande de liaison
router.patch('/api/liaison/:id/statut', authenticateToken, requireRole('establishment'), async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, messageReponse } = req.body;
    const userId = req.user.id;

    console.log(`🔄 Mise à jour statut liaison ${id} vers ${statut}`);

    // Vérifier que la liaison existe et appartient à l'établissement
    const liaison = await prisma.liaisonApprenantEtablissement.findUnique({
      where: { id: parseInt(id) },
      include: {
        etablissement: true
      }
    });

    if (!liaison) {
      return res.status(404).json({
        success: false,
        message: 'Demande de liaison non trouvée'
      });
    }

    if (liaison.etablissementId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette demande'
      });
    }

    if (liaison.statutLiaison !== 'EN_ATTENTE') {
      return res.status(400).json({
        success: false,
        message: 'Cette demande a déjà été traitée'
      });
    }

    // Limite d'apprenants liés selon le plan (vérifiée uniquement à l'approbation)
    if (statut === 'APPROUVE') {
      const sub = await subscriptionService.getOrCreateTrial(userId);
      const usage = await subscriptionService.getUsage(userId, sub.plan);
      const r = usage.apprenants;
      if (r && r.limite !== null && r.utilises >= r.limite) {
        return res.status(403).json({
          success: false,
          code: 'QUOTA_EXCEEDED',
          message: `Limite atteinte (${r.limite} apprenants liés pour le plan ${sub.plan}). Passez à un plan supérieur pour lier davantage d'apprenants.`,
          data: r,
        });
      }
    }

    // Mettre à jour le statut
    const updateData = {
      statutLiaison: statut,
      messageReponse: messageReponse || null
    };

    if (statut === 'APPROUVE') {
      updateData.dateApprobation = new Date();
    } else if (statut === 'REJETE') {
      updateData.dateRejet = new Date();
    }

    const liaisonMiseAJour = await prisma.liaisonApprenantEtablissement.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        apprenant: {
          select: {
            nom: true,
            prenom: true,
            email: true
          }
        },
        etablissement: {
          select: {
            nomEtablissement: true
          }
        }
      }
    });

    console.log(`✅ Liaison ${id} mise à jour vers ${statut}`);

    // Créer une notification pour l'étudiant
    await createNotification({
      userId: liaison.apprenantId,
      userType: 'apprenant',
      type: statut === 'APPROUVE' ? 'DEMANDE_LIAISON_APPROUVEE' : 'DEMANDE_LIAISON_REJETEE',
      titre: statut === 'APPROUVE' 
        ? 'Demande de liaison approuvée' 
        : 'Demande de liaison rejetée',
      message: statut === 'APPROUVE'
        ? `Votre demande de liaison avec ${liaison.etablissement.nomEtablissement} a été approuvée`
        : `Votre demande de liaison avec ${liaison.etablissement.nomEtablissement} a été rejetée`,
      important: true,
      lienAction: '/dashboard?userType=student',
      metadonnees: { liaisonId: liaison.id, etablissementId: liaison.etablissementId }
    });

    res.json({
      success: true,
      message: `Demande ${statut === 'APPROUVE' ? 'approuvée' : 'rejetée'} avec succès`,
      data: liaisonMiseAJour
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour statut liaison:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut',
      error: error.message
    });
  }
});
module.exports = router;
