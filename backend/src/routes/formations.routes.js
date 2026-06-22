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
const { checkFormationQuota } = require('../middleware/subscription');

const router = express.Router();

// ========================================
// ROUTES POUR FORMATIONS
// ========================================

// Récupérer les formations d'un établissement
router.get('/api/etablissement/:id/formations', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Vérifier que l'utilisateur peut accéder aux formations de cet établissement
    if (userRole === 'establishment' && parseInt(id) !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé aux formations de cet établissement'
      });
    }

    const formations = await prisma.formation.findMany({
      where: { etablissementId: parseInt(id) },
      orderBy: { dateCreation: 'desc' },
      select: {
        id: true,
        nomFormation: true,
        description: true,
        typeFormation: true,
        dureeFormation: true,
        niveauFormation: true,
        statut: true,
        dateCreation: true,
        dateModification: true,
        _count: {
          select: { certificats: true }
        }
      }
    });

    console.log(`✅ ${formations.length} formations récupérées pour l'établissement ${id}`);

    res.json({
      success: true,
      data: formations
    });

  } catch (error) {
    console.error('❌ Erreur récupération formations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des formations',
      error: error.message
    });
  }
});

// Créer une nouvelle formation
router.post('/api/formations', authenticateToken, requireRole('establishment'), checkFormationQuota, async (req, res) => {
  try {
    console.log('📥 Données reçues:', req.body);
    console.log('📥 Headers:', req.headers);
    
    const { nomFormation, description, typeFormation, dureeFormation, niveauFormation } = req.body;
    const etablissementId = req.user.id;

    console.log('🔍 Validation:', { nomFormation, typeFormation, etablissementId });

    if (!nomFormation || !typeFormation) {
      return res.status(400).json({
        success: false,
        message: 'Nom de formation et type de formation sont requis'
      });
    }

    // Vérifier que le type de formation est valide
    const validTypes = ['DIPLOME', 'CERTIFICAT_FORMATION', 'ATTESTATION_PRESENCE', 'CERTIFICATION_COMPETENCES', 'FORMATION_CONTINUE', 'STAGE', 'SEMINAIRE'];
    if (!validTypes.includes(typeFormation)) {
      return res.status(400).json({
        success: false,
        message: 'Type de formation invalide'
      });
    }

    const formation = await prisma.formation.create({
      data: {
        etablissementId,
        nomFormation,
        description: description || null,
        typeFormation,
        dureeFormation: dureeFormation || null,
        niveauFormation: niveauFormation || null,
        statut: 'ACTIF'
      }
    });

    console.log(`✅ Formation créée: ${formation.nomFormation} (ID: ${formation.id})`);

    res.status(201).json({
      success: true,
      message: 'Formation créée avec succès',
      data: formation
    });

  } catch (error) {
    console.error('❌ Erreur création formation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la formation',
      error: error.message
    });
  }
});

// Modifier une formation
router.put('/api/formations/:id', authenticateToken, requireRole('establishment'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nomFormation, description, typeFormation, dureeFormation, niveauFormation, statut } = req.body;
    const etablissementId = req.user.id;

    // Vérifier que la formation appartient à l'établissement
    const existingFormation = await prisma.formation.findFirst({
      where: { id: parseInt(id), etablissementId }
    });

    if (!existingFormation) {
      return res.status(404).json({
        success: false,
        message: 'Formation non trouvée ou accès non autorisé'
      });
    }

    // Vérifier que le type de formation est valide si fourni
    if (typeFormation) {
      const validTypes = ['DIPLOME', 'CERTIFICAT_FORMATION', 'ATTESTATION_PRESENCE', 'CERTIFICATION_COMPETENCES', 'FORMATION_CONTINUE', 'STAGE', 'SEMINAIRE'];
      if (!validTypes.includes(typeFormation)) {
        return res.status(400).json({
          success: false,
          message: 'Type de formation invalide'
        });
      }
    }

    const formation = await prisma.formation.update({
      where: { id: parseInt(id) },
      data: {
        nomFormation: nomFormation || existingFormation.nomFormation,
        description: description !== undefined ? description : existingFormation.description,
        typeFormation: typeFormation || existingFormation.typeFormation,
        dureeFormation: dureeFormation !== undefined ? dureeFormation : existingFormation.dureeFormation,
        niveauFormation: niveauFormation !== undefined ? niveauFormation : existingFormation.niveauFormation,
        statut: statut || existingFormation.statut,
        dateModification: new Date()
      }
    });

    console.log(`✅ Formation modifiée: ${formation.nomFormation} (ID: ${formation.id})`);

    res.json({
      success: true,
      message: 'Formation modifiée avec succès',
      data: formation
    });

  } catch (error) {
    console.error('❌ Erreur modification formation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification de la formation',
      error: error.message
    });
  }
});

// Supprimer une formation
router.delete('/api/formations/:id', authenticateToken, requireRole('establishment'), async (req, res) => {
  try {
    const { id } = req.params;
    const etablissementId = req.user.id;

    // Vérifier que la formation appartient à l'établissement
    const existingFormation = await prisma.formation.findFirst({
      where: { id: parseInt(id), etablissementId },
      include: { _count: { select: { certificats: true } } }
    });

    if (!existingFormation) {
      return res.status(404).json({
        success: false,
        message: 'Formation non trouvée ou accès non autorisé'
      });
    }

    // Vérifier qu'aucun certificat n'utilise cette formation
    if (existingFormation._count.certificats > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une formation utilisée par des certificats'
      });
    }

    await prisma.formation.delete({
      where: { id: parseInt(id) }
    });

    console.log(`✅ Formation supprimée: ${existingFormation.nomFormation} (ID: ${id})`);

    res.json({
      success: true,
      message: 'Formation supprimée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression formation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la formation',
      error: error.message
    });
  }
});
module.exports = router;
