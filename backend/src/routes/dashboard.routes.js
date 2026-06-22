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

// ========================================
// ROUTES POUR DASHBOARDS
// ========================================

// Récupérer les statistiques du dashboard pour un apprenant
router.get('/api/apprenant/:id/dashboard', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Vérifier les permissions
    if (userRole === 'student' && parseInt(id) !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé' 
      });
    }

    const apprenantId = parseInt(id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Statistiques générales
    const totalCertificats = await prisma.certificat.count({
      where: { 
        apprenantId,
        statut: { in: ['EMIS', 'REVOQUE'] } // Seulement les certificats émis ou révoqués
      }
    });

    const certificatsEmis = await prisma.certificat.count({
      where: { 
        apprenantId,
        statut: 'EMIS'
      }
    });

    const totalVerifications = await prisma.verificationStat.count({
      where: {
        certificat: {
          apprenantId
        }
      }
    });

    const verificationsRecentes = await prisma.verificationStat.count({
      where: {
        certificat: {
          apprenantId
        },
        verifiedAt: { gte: startOfMonth }
      }
    });

    const etablissementsLies = await prisma.liaisonApprenantEtablissement.count({
      where: { 
        apprenantId,
        statutLiaison: 'APPROUVE'
      }
    });

    const demandesEnAttente = await prisma.demandeCertificat.count({
      where: { 
        apprenantId,
        statutDemande: 'EN_ATTENTE'
      }
    });

    // Derniers certificats (3 derniers)
    const recentCertificates = await prisma.certificat.findMany({
      where: { 
        apprenantId,
        statut: { in: ['EMIS', 'REVOQUE'] }
      },
      include: {
        etablissement: {
          select: {
            nomEtablissement: true
          }
        },
        _count: {
          select: {
            verificationStats: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    const certificatesList = recentCertificates.map(cert => ({
      id: cert.id,
      titre: cert.titre,
      etablissement: cert.etablissement.nomEtablissement,
      dateObtention: cert.dateObtention,
      statut: cert.statut,
      verifications: cert._count.verificationStats
    }));

    // Dernières notifications (5 dernières)
    const recentNotifications = await prisma.notification.findMany({
      where: { 
        userId: apprenantId,
        userType: 'apprenant'
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const notificationsList = recentNotifications.map(notif => ({
      id: notif.id,
      titre: notif.titre,
      message: notif.message,
      lu: notif.lu,
      important: notif.important,
      type: notif.type,
      timeAgo: getTimeAgo(notif.createdAt)
    }));

    // Statistiques d'activité (pour graphique)
    const activityData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const certificatsCount = await prisma.certificat.count({
        where: {
          apprenantId,
          statut: 'EMIS',
          createdAt: { gte: monthStart, lte: monthEnd }
        }
      });

      const verificationsCount = await prisma.verificationStat.count({
        where: {
          certificat: {
            apprenantId
          },
          verifiedAt: { gte: monthStart, lte: monthEnd }
        }
      });

      activityData.push({
        month: monthStart.toLocaleDateString('fr-FR', { month: 'short' }),
        certificates: certificatsCount,
        verifications: verificationsCount
      });
    }

    res.json({ 
      success: true, 
      data: {
        stats: {
          totalCertificates: totalCertificats,
          certificatesIssued: certificatsEmis,
          totalVerifications,
          recentVerifications: verificationsRecentes,
          linkedEstablishments: etablissementsLies,
          pendingRequests: demandesEnAttente
        },
        recentCertificates: certificatesList,
        recentNotifications: notificationsList,
        activityData
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération dashboard apprenant:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des données du dashboard',
      error: error.message 
    });
  }
});

// Récupérer les statistiques du dashboard pour un établissement
router.get('/api/etablissement/:id/dashboard', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Vérifier les permissions
    if (userRole === 'establishment' && parseInt(id) !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé' 
      });
    }

    const etablissementId = parseInt(id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Statistiques générales pour le mois en cours
    const certificatsEmis = await prisma.certificat.count({
      where: { 
        etablissementId,
        statut: 'EMIS',
        createdAt: { gte: startOfMonth }
      }
    });

    const totalVerifications = await prisma.verificationStat.count({
      where: {
        certificat: {
          etablissementId
        },
        verifiedAt: { gte: startOfMonth }
      }
    });

    const etudiantsActifs = await prisma.liaisonApprenantEtablissement.count({
      where: { 
        etablissementId,
        statutLiaison: 'APPROUVE'
      }
    });

    const demandesEnAttente = await prisma.liaisonApprenantEtablissement.count({
      where: { 
        etablissementId,
        statutLiaison: 'EN_ATTENTE'
      }
    });

    // Demandes en attente avec détails (3 dernières)
    const pendingRequests = await prisma.liaisonApprenantEtablissement.findMany({
      where: { 
        etablissementId,
        statutLiaison: 'EN_ATTENTE'
      },
      include: {
        apprenant: {
          select: {
            id_apprenant: true,
            nom: true,
            prenom: true,
            email: true
          }
        }
      },
      orderBy: { dateDemande: 'desc' },
      take: 3
    });

    // Activité récente (dernières 5 actions)
    const recentActivity = [];

    // 1. Derniers certificats émis
    const recentCertificates = await prisma.certificat.findMany({
      where: { 
        etablissementId,
        statut: 'EMIS'
      },
      include: {
        apprenant: {
          select: {
            nom: true,
            prenom: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 2
    });

    recentCertificates.forEach(cert => {
      recentActivity.push({
        type: 'certificate',
        titre: 'Certificat émis',
        description: `${cert.titre} pour ${cert.apprenant.prenom} ${cert.apprenant.nom}`,
        date: cert.createdAt,
        statut: 'issued'
      });
    });

    // 2. Dernières vérifications
    const recentVerifications = await prisma.verificationStat.findMany({
      where: {
        certificat: {
          etablissementId
        }
      },
      include: {
        certificat: {
          select: {
            titre: true,
            uuid: true
          }
        }
      },
      orderBy: { verifiedAt: 'desc' },
      take: 2
    });

    recentVerifications.forEach(verif => {
      recentActivity.push({
        type: 'verification',
        titre: 'Vérification blockchain',
        description: `Certificat ${verif.certificat.titre}`,
        date: verif.verifiedAt,
        statut: 'verified'
      });
    });

    // 3. Dernières liaisons approuvées
    const recentLiaisons = await prisma.liaisonApprenantEtablissement.findMany({
      where: { 
        etablissementId,
        statutLiaison: 'APPROUVE'
      },
      include: {
        apprenant: {
          select: {
            nom: true,
            prenom: true
          }
        }
      },
      orderBy: { dateApprobation: 'desc' },
      take: 1
    });

    recentLiaisons.forEach(liaison => {
      recentActivity.push({
        type: 'student',
        titre: 'Nouvel étudiant lié',
        description: `${liaison.apprenant.prenom} ${liaison.apprenant.nom}`,
        date: liaison.dateApprobation,
        statut: 'linked'
      });
    });

    // Trier par date et limiter à 5
    const sortedActivity = recentActivity
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(activity => ({
        ...activity,
        timeAgo: getTimeAgo(new Date(activity.date))
      }));

    // Données pour le graphique (6 derniers mois)
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const verificationsCount = await prisma.verificationStat.count({
        where: {
          certificat: {
            etablissementId
          },
          verifiedAt: { gte: monthStart, lte: monthEnd }
        }
      });

      chartData.push({
        name: monthStart.toLocaleDateString('fr-FR', { month: 'short' }),
        verifications: verificationsCount
      });
    }

    res.json({ 
      success: true, 
      data: {
        stats: {
          certificatesIssued: certificatsEmis,
          totalVerifications,
          activeStudents: etudiantsActifs,
          pendingRequests: demandesEnAttente
        },
        pendingRequests: pendingRequests.map(pr => ({
          id: pr.id,
          name: `${pr.apprenant.prenom} ${pr.apprenant.nom}`,
          email: pr.apprenant.email,
          date: pr.dateDemande,
          status: pr.statutLiaison
        })),
        recentActivity: sortedActivity,
        chartData
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération dashboard établissement:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des données du dashboard',
      error: error.message 
    });
  }
});
module.exports = router;
