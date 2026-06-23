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
const blockchain = require('../services/blockchainService');
const subscriptionService = require('../services/subscriptionService');

const router = express.Router();

// Infos du wallet relayer / trésorerie de la plateforme (modèle meta-transactions)
router.get('/api/admin/relayer-wallet', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    if (!process.env.RELAYER_PRIVATE_KEY) {
      return res.status(500).json({ success: false, message: 'Wallet relayer non configuré (RELAYER_PRIVATE_KEY)' });
    }
    const info = await blockchain.getRelayerInfo();
    return res.json({ success: true, data: info });
  } catch (error) {
    console.error('❌ Erreur récupération wallet relayer:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// Route pour récupérer tous les établissements (pour l'admin)
router.get('/api/admin/etablissements', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const etablissements = await prisma.etablissement.findMany({
      select: {
        id_etablissement: true,
        nomEtablissement: true,
        emailEtablissement: true,
        statut: true,
        dateCreation: true,
        nomResponsableEtablissement: true,
        telephoneEtablissement: true,
        adresseEtablissement: true,
        typeEtablissement: true,
        documents: {
          select: {
            id: true,
            typeDocument: true,
            nomFichier: true,
            cheminFichier: true,
            dateUpload: true
          }
        }
      },
      orderBy: { dateCreation: 'desc' }
    });
    
    res.json({
      success: true,
      data: etablissements
    });
    
  } catch (error) {
    console.error('Erreur récupération établissements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des établissements',
      error: error.message
    });
  }
});

// Route pour nettoyer les sessions expirées (cron job)
router.post('/api/admin/cleanup-sessions', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const cleanedCount = await cleanupExpiredSessions();
    
    res.json({
      success: true,
      message: `${cleanedCount} sessions expirées nettoyées`,
      cleanedCount: cleanedCount
    });
  } catch (error) {
    console.error('❌ Erreur nettoyage sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du nettoyage des sessions',
      error: error.message
    });
  }
});

// Route pour changer le statut d'un établissement (pour l'admin)
router.patch('/api/admin/etablissement/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, commentaires } = req.body;
    
    // Validation du statut
    const statutsValides = ['EN_ATTENTE', 'ACTIF', 'REJETE', 'SUSPENDU'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }
    
    // Mettre à jour l'établissement
    const etablissement = await prisma.etablissement.update({
      where: { id_etablissement: parseInt(id) },
      data: {
        statut,
        dateModification: new Date()
      }
    });
    
          // Si le statut est rejeté ou suspendu, ajouter des commentaires aux documents
      if ((statut === 'REJETE' || statut === 'SUSPENDU') && commentaires) {
        await prisma.documentEtablissement.updateMany({
          where: { etablissementId: parseInt(id) },
          data: {
            commentaires,
            dateValidation: new Date()
          }
        });
      }
      
      // Si le statut est actif, marquer les documents comme validés
      if (statut === 'ACTIF') {
        await prisma.documentEtablissement.updateMany({
          where: { etablissementId: parseInt(id) },
          data: {
            statut: 'VALIDE',
            dateValidation: new Date()
          }
        });

        // Démarrer l'essai gratuit (30 jours) à la validation de l'établissement
        try {
          await subscriptionService.getOrCreateTrial(parseInt(id));
        } catch (subError) {
          console.error('⚠️ Création essai gratuit échouée:', subError.message);
        }
      }
    
    res.json({
      success: true,
      message: `Statut de l'établissement mis à jour vers ${statut}`,
      data: etablissement
    });
    
  } catch (error) {
    console.error('Erreur mise à jour statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut',
      error: error.message
    });
  }
});

// Route pour visualiser un document dans le navigateur
router.get('/api/admin/document/:id/view', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer les informations du document
    const document = await prisma.documentEtablissement.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }
    
    // Si le document a une URL Supabase, rediriger vers celle-ci
    if (document.cheminFichier && document.cheminFichier.startsWith('http')) {
      return res.redirect(document.cheminFichier);
    }
    
    // Sinon, utiliser Supabase Storage avec URL signée
    const filePath = `etablissements/${document.etablissementId}/${document.nomFichier}`;
    
    const result = await supabaseStorage.getSignedUrl(filePath, 3600); // 1 heure
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé dans le stockage'
      });
    }
    
    // Rediriger vers l'URL signée Supabase
    res.redirect(result.url);
    
    console.log(`👁️ Document visualisé: ${document.nomFichier}`);
    
  } catch (error) {
    console.error('Erreur visualisation document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la visualisation du document',
      error: error.message
    });
  }
});

// Route pour télécharger un document
router.get('/api/admin/document/:id/download', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer les informations du document
    const document = await prisma.documentEtablissement.findUnique({
      where: { id: parseInt(id) },
      include: {
        etablissement: {
          select: {
            id_etablissement: true,
            nomEtablissement: true
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
    
    // Si le document a une URL Supabase, rediriger vers celle-ci
    if (document.cheminFichier && document.cheminFichier.startsWith('http')) {
      return res.redirect(document.cheminFichier);
    }
    
    // Sinon, utiliser Supabase Storage avec URL signée
    const filePath = `etablissements/${document.etablissementId}/${document.nomFichier}`;
    
    const result = await supabaseStorage.getSignedUrl(filePath, 3600); // 1 heure
    
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé dans le stockage'
      });
    }
    
    // Rediriger vers l'URL signée Supabase
    res.redirect(result.url);
    
    console.log(`📥 Document téléchargé: ${document.nomFichier}`);
    
  } catch (error) {
    console.error('Erreur téléchargement document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du téléchargement du document',
      error: error.message
    });
  }
});

// Route pour suspendre un établissement (pour l'admin)
router.patch('/api/admin/etablissement/:id/suspend', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaires } = req.body;
    
    // Mettre à jour l'établissement
    const etablissement = await prisma.etablissement.update({
      where: { id_etablissement: parseInt(id) },
      data: {
        statut: 'SUSPENDU',
        dateModification: new Date()
      }
    });
    
    // Ajouter des commentaires aux documents si fournis
    if (commentaires) {
      await prisma.documentEtablissement.updateMany({
        where: { etablissementId: parseInt(id) },
        data: {
          commentaires,
          dateValidation: new Date()
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Établissement suspendu avec succès',
      data: etablissement
    });
    
  } catch (error) {
    console.error('Erreur suspension établissement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suspension',
      error: error.message
    });
  }
});

// ========================================
// ROUTES ADMIN POUR LA GESTION DES UTILISATEURS
// ========================================

// Route pour récupérer tous les apprenants (admin)
router.get('/api/admin/apprenants', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    console.log('🔍 Récupération de tous les apprenants...');
    
    const apprenants = await prisma.apprenant.findMany({
      select: {
        id_apprenant: true,
        email: true,
        nom: true,
        prenom: true,
        telephone: true,
        statut: true,
        dateCreation: true,
        dateModification: true,
        liaisons: {
          select: {
            id: true,
            statutLiaison: true,
            dateDemande: true,
            etablissement: {
              select: {
                id_etablissement: true,
                nomEtablissement: true,
                typeEtablissement: true
              }
            }
          }
        }
      },
      orderBy: { dateCreation: 'desc' }
    });
    
    console.log(`✅ ${apprenants.length} apprenants trouvés`);
    
    res.json({
      success: true,
      data: apprenants
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération apprenants:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des apprenants',
      error: error.message
    });
  }
});

// Route pour mettre à jour le statut d'un apprenant (admin)
router.patch('/api/admin/apprenant/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, commentaires } = req.body;
    
    console.log(`🔄 Mise à jour statut apprenant ${id} vers ${statut}`);
    
    // Mettre à jour l'apprenant
    const apprenant = await prisma.apprenant.update({
      where: { id_apprenant: parseInt(id) },
      data: {
        statut,
        dateModification: new Date()
      }
    });
    
    console.log(`✅ Statut apprenant mis à jour: ${apprenant.email} -> ${statut}`);
    
    res.json({
      success: true,
      message: `Statut de l'apprenant mis à jour vers ${statut}`,
      data: apprenant
    });
    
  } catch (error) {
    console.error('❌ Erreur mise à jour statut apprenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du statut',
      error: error.message
    });
  }
});

// Route pour supprimer un apprenant (admin)
router.delete('/api/admin/apprenant/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Suppression apprenant ${id}`);
    
    // Vérifier que l'apprenant existe
    const apprenant = await prisma.apprenant.findUnique({
      where: { id_apprenant: parseInt(id) }
    });
    
    if (!apprenant) {
      return res.status(404).json({
        success: false,
        message: 'Apprenant non trouvé'
      });
    }
    
    // Supprimer l'apprenant
    await prisma.apprenant.delete({
      where: { id_apprenant: parseInt(id) }
    });
    
    console.log(`✅ Apprenant supprimé: ${apprenant.email}`);
    
    res.json({
      success: true,
      message: 'Apprenant supprimé avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression apprenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: error.message
    });
  }
});

// Route pour créer un nouvel apprenant (admin)
router.post('/api/admin/apprenant', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { email, motDePasse, nom, prenom, telephone, etablissements } = req.body;
    
    console.log(`➕ Création nouvel apprenant: ${email}`);
    
    // Vérifier que l'email n'existe pas déjà
    const existingApprenant = await prisma.apprenant.findUnique({
      where: { email }
    });
    
    if (existingApprenant) {
      return res.status(400).json({
        success: false,
        message: 'Un apprenant avec cet email existe déjà'
      });
    }
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(motDePasse, 10);
    
    // Créer l'apprenant
    const apprenant = await prisma.apprenant.create({
      data: {
        email,
        motDePasse: hashedPassword,
        nom,
        prenom,
        telephone: telephone || null,
        statut: 'ACTIF' // Par défaut actif pour les créations admin
      }
    });

    // Créer les liaisons avec les établissements si fournis
    if (etablissements && etablissements.length > 0) {
      const liaisonPromises = etablissements.map(async (nomEtablissement) => {
        // Trouver l'établissement par nom
        const etablissement = await prisma.etablissement.findFirst({
          where: { 
            nomEtablissement: nomEtablissement,
            statut: 'ACTIF'
          }
        });

        if (etablissement) {
          return prisma.liaisonApprenantEtablissement.create({
            data: {
              apprenantId: apprenant.id_apprenant,
              etablissementId: etablissement.id_etablissement,
              statutLiaison: 'APPROUVE', // Les créations admin sont automatiquement approuvées
              dateApprobation: new Date()
            }
          });
        }
        return null;
      });

      await Promise.all(liaisonPromises.filter(promise => promise !== null));
    }
    
    console.log(`✅ Apprenant créé: ${apprenant.email} (ID: ${apprenant.id_apprenant})`);
    
    res.status(201).json({
      success: true,
      message: 'Apprenant créé avec succès',
      data: apprenant
    });
    
  } catch (error) {
    console.error('❌ Erreur création apprenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'apprenant',
      error: error.message
    });
  }
});

// Route pour créer un nouvel établissement (admin)
router.post('/api/admin/etablissement', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const {
      nomEtablissement,
      emailEtablissement,
      motDePasseEtablissement,
      rccmEtablissement,
      typeEtablissement,
      adresseEtablissement,
      telephoneEtablissement,
      nomResponsableEtablissement,
      emailResponsableEtablissement,
      telephoneResponsableEtablissement
    } = req.body;
    
    console.log(`➕ Création nouvel établissement: ${nomEtablissement}`);
    
    // Vérifier que l'email n'existe pas déjà
    const existingEtablissement = await prisma.etablissement.findUnique({
      where: { emailEtablissement }
    });
    
    if (existingEtablissement) {
      return res.status(400).json({
        success: false,
        message: 'Un établissement avec cet email existe déjà'
      });
    }
    
    // Vérifier que le RCCM n'existe pas déjà
    const existingRCCM = await prisma.etablissement.findUnique({
      where: { rccmEtablissement }
    });
    
    if (existingRCCM) {
      return res.status(400).json({
        success: false,
        message: 'Un établissement avec ce numéro RCCM existe déjà'
      });
    }
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(motDePasseEtablissement, 10);
    
    // Mapper le type d'établissement
    const mappedType = mapTypeEtablissement(typeEtablissement);
    
    // Créer l'établissement
    const etablissement = await prisma.etablissement.create({
      data: {
        nomEtablissement,
        emailEtablissement,
        motDePasseEtablissement: hashedPassword,
        rccmEtablissement,
        typeEtablissement: mappedType,
        adresseEtablissement,
        telephoneEtablissement,
        nomResponsableEtablissement,
        emailResponsableEtablissement,
        telephoneResponsableEtablissement,
        statut: 'ACTIF' // Par défaut actif pour les créations admin
      }
    });
    
    console.log(`✅ Établissement créé: ${etablissement.nomEtablissement} (ID: ${etablissement.id_etablissement})`);
    
    res.status(201).json({
      success: true,
      message: 'Établissement créé avec succès',
      data: etablissement
    });
    
  } catch (error) {
    console.error('❌ Erreur création établissement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'établissement',
      error: error.message
    });
  }
});

// Route pour supprimer un établissement (admin)
router.delete('/api/admin/etablissement/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Suppression établissement ${id}`);
    
    // Vérifier que l'établissement existe
    const etablissement = await prisma.etablissement.findUnique({
      where: { id_etablissement: parseInt(id) },
      include: {
        apprenants: true,
        documents: true
      }
    });
    
    if (!etablissement) {
      return res.status(404).json({
        success: false,
        message: 'Établissement non trouvé'
      });
    }
    
    // Supprimer d'abord les documents associés
    if (etablissement.documents.length > 0) {
      await prisma.documentEtablissement.deleteMany({
        where: { etablissementId: parseInt(id) }
      });
      console.log(`🗑️ ${etablissement.documents.length} documents supprimés`);
    }
    
    // Supprimer l'établissement
    await prisma.etablissement.delete({
      where: { id_etablissement: parseInt(id) }
    });
    
    console.log(`✅ Établissement supprimé: ${etablissement.nomEtablissement}`);
    
    res.json({
      success: true,
      message: 'Établissement supprimé avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression établissement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      error: error.message
    });
  }
});

// ========================================
// STATISTIQUES & ACTIVITÉ ADMIN
// ========================================

// Calcule le pourcentage d'évolution entre deux valeurs
function computeChange(current, previous) {
  if (previous === 0) {
    return {
      change: current > 0 ? 100 : 0,
      changeType: current > 0 ? 'increase' : 'neutral'
    };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return {
    change: Math.abs(pct),
    changeType: pct > 0 ? 'increase' : pct < 0 ? 'decrease' : 'neutral'
  };
}

// Tableau de bord admin : KPIs réels, actions prioritaires, activité récente
router.get('/api/admin/stats', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days) || 30);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [
      totalEtablissements, etabThisMonth, etabPrevMonth,
      totalApprenants, apprThisMonth, apprPrevMonth,
      totalCertificats, certThisMonth, certPrevMonth,
      totalVerifications, verifThisMonth, verifPrevMonth,
      pendingEstablishments, failedPayments,
      newEtabPeriod, newCertPeriod, newVerifPeriod
    ] = await Promise.all([
      prisma.etablissement.count(),
      prisma.etablissement.count({ where: { dateCreation: { gte: startOfMonth } } }),
      prisma.etablissement.count({ where: { dateCreation: { gte: startOfPrevMonth, lte: endOfPrevMonth } } }),
      prisma.apprenant.count(),
      prisma.apprenant.count({ where: { dateCreation: { gte: startOfMonth } } }),
      prisma.apprenant.count({ where: { dateCreation: { gte: startOfPrevMonth, lte: endOfPrevMonth } } }),
      prisma.certificat.count({ where: { statut: 'EMIS' } }),
      prisma.certificat.count({ where: { statut: 'EMIS', createdAt: { gte: startOfMonth } } }),
      prisma.certificat.count({ where: { statut: 'EMIS', createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } } }),
      prisma.verificationStat.count(),
      prisma.verificationStat.count({ where: { verifiedAt: { gte: startOfMonth } } }),
      prisma.verificationStat.count({ where: { verifiedAt: { gte: startOfPrevMonth, lte: endOfPrevMonth } } }),
      prisma.etablissement.count({ where: { statut: 'EN_ATTENTE' } }),
      prisma.payment.count({ where: { statut: 'ECHOUE' } }),
      prisma.etablissement.count({ where: { dateCreation: { gte: periodStart } } }),
      prisma.certificat.count({ where: { statut: 'EMIS', createdAt: { gte: periodStart } } }),
      prisma.verificationStat.count({ where: { verifiedAt: { gte: periodStart } } })
    ]);

    const kpis = {
      etablissements: { value: totalEtablissements, ...computeChange(etabThisMonth, etabPrevMonth) },
      apprenants: { value: totalApprenants, ...computeChange(apprThisMonth, apprPrevMonth) },
      certificats: { value: totalCertificats, ...computeChange(certThisMonth, certPrevMonth) },
      verifications: { value: totalVerifications, ...computeChange(verifThisMonth, verifPrevMonth) }
    };

    // Activité récente agrégée
    const activity = await buildActivityFeed(8);

    res.json({
      success: true,
      data: {
        kpis,
        priorityActions: { pendingEstablishments, failedPayments },
        recentActivity: activity,
        period: {
          days,
          newEstablishments: newEtabPeriod,
          newCertificates: newCertPeriod,
          newVerifications: newVerifPeriod
        }
      }
    });
  } catch (error) {
    console.error('❌ Erreur récupération stats admin:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des statistiques', error: error.message });
  }
});

// Construit un flux d'activité agrégé (établissements, certificats, paiements)
async function buildActivityFeed(limit = 20) {
  const perType = Math.max(3, Math.ceil(limit / 2));

  const [etablissements, certificats, paiements] = await Promise.all([
    prisma.etablissement.findMany({
      select: { id_etablissement: true, nomEtablissement: true, statut: true, dateCreation: true },
      orderBy: { dateCreation: 'desc' },
      take: perType
    }),
    prisma.certificat.findMany({
      where: { statut: 'EMIS' },
      select: { id: true, titre: true, createdAt: true, issuedAt: true, etablissement: { select: { nomEtablissement: true } } },
      orderBy: { createdAt: 'desc' },
      take: perType
    }),
    prisma.payment.findMany({
      select: { id: true, plan: true, montant: true, devise: true, statut: true, createdAt: true, etablissement: { select: { nomEtablissement: true } } },
      orderBy: { createdAt: 'desc' },
      take: perType
    })
  ]);

  const items = [];

  etablissements.forEach((e) => {
    items.push({
      id: `etab-${e.id_etablissement}`,
      action: 'Nouvel établissement inscrit',
      description: `${e.nomEtablissement}${e.statut === 'EN_ATTENTE' ? ' (en attente de validation)' : ''}`,
      date: e.dateCreation,
      user: 'Système',
      severity: e.statut === 'EN_ATTENTE' ? 'warning' : 'info'
    });
  });

  certificats.forEach((c) => {
    items.push({
      id: `cert-${c.id}`,
      action: 'Certificat émis',
      description: `${c.titre}${c.etablissement ? ' - ' + c.etablissement.nomEtablissement : ''}`,
      date: c.issuedAt || c.createdAt,
      user: 'Système',
      severity: 'success'
    });
  });

  paiements.forEach((p) => {
    const labelStatut = p.statut === 'REUSSI' ? 'réussi' : p.statut === 'ECHOUE' ? 'échoué' : 'en attente';
    items.push({
      id: `pay-${p.id}`,
      action: `Paiement ${labelStatut}`,
      description: `Plan ${p.plan}${p.etablissement ? ' - ' + p.etablissement.nomEtablissement : ''} (${p.montant} ${p.devise})`,
      date: p.createdAt,
      user: 'Système',
      severity: p.statut === 'ECHOUE' ? 'error' : p.statut === 'REUSSI' ? 'success' : 'info'
    });
  });

  return items
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
    .map((it) => ({ ...it, timeAgo: getTimeAgo(new Date(it.date)) }));
}

// Flux d'activité complet (lecture seule) pour la page Notifications/Activité
router.get('/api/admin/activity', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const activity = await buildActivityFeed(limit);
    res.json({ success: true, data: activity });
  } catch (error) {
    console.error('❌ Erreur récupération activité admin:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'activité', error: error.message });
  }
});

// ========================================
// PARAMÈTRES ADMIN
// ========================================

const DEFAULT_ADMIN_SETTINGS = {
  emailAlerts: true,
  pushNotifications: false,
  autoReports: false,
  language: 'fr',
  theme: 'light'
};

// Récupérer les préférences de l'admin courant (création par défaut si absent)
router.get('/api/admin/settings', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const adminId = req.user.id;
    const settings = await prisma.adminSettings.upsert({
      where: { adminId },
      update: {},
      create: { adminId, ...DEFAULT_ADMIN_SETTINGS }
    });
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('❌ Erreur récupération paramètres admin:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des paramètres', error: error.message });
  }
});

// Mettre à jour les préférences de l'admin courant
router.put('/api/admin/settings', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const adminId = req.user.id;
    const { emailAlerts, pushNotifications, autoReports, language, theme } = req.body;

    const data = {};
    if (typeof emailAlerts === 'boolean') data.emailAlerts = emailAlerts;
    if (typeof pushNotifications === 'boolean') data.pushNotifications = pushNotifications;
    if (typeof autoReports === 'boolean') data.autoReports = autoReports;
    if (language === 'fr' || language === 'en') data.language = language;
    if (theme === 'light' || theme === 'dark') data.theme = theme;

    const settings = await prisma.adminSettings.upsert({
      where: { adminId },
      update: data,
      create: { adminId, ...DEFAULT_ADMIN_SETTINGS, ...data }
    });

    res.json({ success: true, message: 'Paramètres mis à jour', data: settings });
  } catch (error) {
    console.error('❌ Erreur mise à jour paramètres admin:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des paramètres', error: error.message });
  }
});

module.exports = router;
