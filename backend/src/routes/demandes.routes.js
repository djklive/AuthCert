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
//                DEMANDES DE CERTIFICAT
// ===============================================

// Route pour créer une demande de certificat (Apprenant uniquement)
router.post('/api/demandes-certificat', authenticateToken, requireRole('student'), upload.array('documents', 5), async (req, res) => {
  try {
    const { etablissementId, titre, description, messageDemande } = req.body;
    const apprenantId = req.user.id;
    const files = req.files || [];

    // Convertir etablissementId en entier
    const etablissementIdInt = parseInt(etablissementId);
    
    if (isNaN(etablissementIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'ID établissement invalide'
      });
    }

    // Vérifier que l'établissement existe et est actif
    const etablissement = await prisma.etablissement.findUnique({
      where: { id_etablissement: etablissementIdInt }
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
        message: 'Cet établissement n\'est pas actif'
      });
    }

    // Créer la demande de certificat
    const demande = await prisma.demandeCertificat.create({
      data: {
        apprenantId,
        etablissementId: etablissementIdInt,
        titre,
        description,
        messageDemande,
        statutDemande: 'EN_ATTENTE'
      },
      include: {
        apprenant: {
          select: {
            id_apprenant: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        etablissement: {
          select: {
            id_etablissement: true,
            nomEtablissement: true
          }
        }
      }
    });

    // Traiter les fichiers uploadés vers Supabase
    const uploadedDocuments = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          // Upload vers Supabase
          const uploadResult = await supabaseStorage.uploadFile(
            file.buffer,
            file.originalname,
            'demandes-certificat',
            file.mimetype
          );

          if (uploadResult.success) {
            // Enregistrer le document en base avec l'URL publique complète
            const document = await prisma.documentDemandeCertificat.create({
              data: {
                demandeId: demande.id,
                nomFichier: file.originalname,
                typeMime: file.mimetype,
                tailleFichier: file.size,
                cheminFichier: uploadResult.url // ✅ URL publique complète
              }
            });
            uploadedDocuments.push(document);
          } else {
            console.error(`❌ Erreur upload fichier ${file.originalname}:`, uploadResult.error);
          }
        } catch (error) {
          console.error(`❌ Erreur traitement fichier ${file.originalname}:`, error);
        }
      }
    }

    // Créer une notification pour l'établissement
    await createNotification({
      userId: etablissementIdInt,
      userType: 'etablissement',
      type: 'DEMANDE_CERTIFICAT_NOUVELLE',
      titre: 'Nouvelle demande de certificat',
      message: `${demande.apprenant.prenom} ${demande.apprenant.nom} a demandé un certificat: "${titre}"`,
      important: true,
      lienAction: '/dashboard?userType=establishment',
      metadonnees: { demandeId: demande.id, apprenantId }
    });

    res.status(201).json({
      success: true,
      message: 'Demande de certificat créée avec succès',
      data: demande
    });

  } catch (error) {
    console.error('Erreur création demande certificat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la demande'
    });
  }
});

// Route pour lister les demandes de certificat d'un apprenant
router.get('/api/apprenant/:id/demandes-certificat', authenticateToken, async (req, res) => {
  try {
    const apprenantId = parseInt(req.params.id);

    // Vérifier que l'utilisateur peut accéder à ces données
    if (req.user.id !== apprenantId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const demandes = await prisma.demandeCertificat.findMany({
      where: { apprenantId },
      include: {
        etablissement: {
          select: {
            id_etablissement: true,
            nomEtablissement: true
          }
        },
        documents: true
      },
      orderBy: { dateDemande: 'desc' }
    });

    res.json({
      success: true,
      data: demandes
    });

  } catch (error) {
    console.error('Erreur récupération demandes apprenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des demandes'
    });
  }
});

// Route pour lister les demandes de certificat d'un établissement
router.get('/api/etablissement/:id/demandes-certificat', authenticateToken, async (req, res) => {
  try {
    const etablissementId = parseInt(req.params.id);

    // Vérifier que l'utilisateur peut accéder à ces données
    if (req.user.id !== etablissementId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const demandes = await prisma.demandeCertificat.findMany({
      where: { etablissementId },
      include: {
        apprenant: {
          select: {
            id_apprenant: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true
          }
        },
        documents: true
      },
      orderBy: { dateDemande: 'desc' }
    });

    res.json({
      success: true,
      data: demandes
    });

  } catch (error) {
    console.error('Erreur récupération demandes établissement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des demandes'
    });
  }
});

// Route pour traiter une demande de certificat (Approuver/Rejeter)
router.patch('/api/demandes-certificat/:id/statut', authenticateToken, async (req, res) => {
  try {
    const demandeId = parseInt(req.params.id);
    const { statutDemande, messageReponse } = req.body;

    // Vérifier que la demande existe
    const demande = await prisma.demandeCertificat.findUnique({
      where: { id: demandeId },
      include: {
        etablissement: true,
        apprenant: true
      }
    });

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    // Vérifier que l'utilisateur peut traiter cette demande
    if (req.user.id !== demande.etablissementId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Mettre à jour le statut de la demande
    const demandeMiseAJour = await prisma.demandeCertificat.update({
      where: { id: demandeId },
      data: {
        statutDemande,
        messageReponse,
        dateTraitement: new Date(),
        traitePar: req.user.role === 'admin' ? req.user.id : null
      },
      include: {
        apprenant: {
          select: {
            id_apprenant: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        etablissement: {
          select: {
            id_etablissement: true,
            nomEtablissement: true
          }
        },
        documents: true
      }
    });

    // Créer une notification pour l'étudiant
    await createNotification({
      userId: demande.apprenantId,
      userType: 'apprenant',
      type: statutDemande === 'APPROUVE' ? 'DEMANDE_CERTIFICAT_APPROUVEE' : 'DEMANDE_CERTIFICAT_REJETEE',
      titre: statutDemande === 'APPROUVE' 
        ? 'Demande de certificat approuvée' 
        : 'Demande de certificat rejetée',
      message: statutDemande === 'APPROUVE'
        ? `Votre demande de certificat "${demande.titre}" a été approuvée par ${demande.etablissement.nomEtablissement}`
        : `Votre demande de certificat "${demande.titre}" a été rejetée par ${demande.etablissement.nomEtablissement}`,
      important: true,
      lienAction: '/dashboard?userType=student',
      metadonnees: { demandeId: demande.id, etablissementId: demande.etablissementId }
    });

    res.json({
      success: true,
      message: `Demande ${statutDemande === 'APPROUVE' ? 'approuvée' : 'rejetée'} avec succès`,
      data: demandeMiseAJour
    });

  } catch (error) {
    console.error('Erreur traitement demande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du traitement de la demande'
    });
  }
});

// Route pour obtenir l'URL d'un document
router.get('/api/documents/:id/url', authenticateToken, async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);

    const document = await prisma.documentDemandeCertificat.findUnique({
      where: { id: documentId },
      include: {
        demande: {
          include: {
            apprenant: true,
            etablissement: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Vérifier les permissions
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const canAccess = 
      userRole === 'admin' ||
      (userRole === 'student' && document.demande.apprenantId === userId) ||
      (userRole === 'establishment' && document.demande.etablissementId === userId);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce document'
      });
    }

    // Générer l'URL appropriée
    const { getAppropriateUrl } = require('../services/storageService');
    const documentUrl = await getAppropriateUrl(document.cheminFichier);

    res.json({
      success: true,
      data: {
        id: document.id,
        nomFichier: document.nomFichier,
        typeMime: document.typeMime,
        tailleFichier: document.tailleFichier,
        url: documentUrl
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération URL document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'URL du document'
    });
  }
});

// Route pour obtenir les détails d'une demande de certificat
router.get('/api/demandes-certificat/:id', authenticateToken, async (req, res) => {
  try {
    const demandeId = parseInt(req.params.id);

    const demande = await prisma.demandeCertificat.findUnique({
      where: { id: demandeId },
      include: {
        apprenant: {
          select: {
            id_apprenant: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            dateCreation: true
          }
        },
        etablissement: {
          select: {
            id_etablissement: true,
            nomEtablissement: true,
            emailEtablissement: true
          }
        },
        documents: true
      }
    });

    if (!demande) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    // Vérifier que l'utilisateur peut accéder à cette demande
    const canAccess = req.user.id === demande.apprenantId || 
                     req.user.id === demande.etablissementId || 
                     req.user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    res.json({
      success: true,
      data: demande
    });

  } catch (error) {
    console.error('Erreur récupération demande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la demande'
    });
  }
});
module.exports = router;
