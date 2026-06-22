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
const blockchain = require('../services/blockchainService');
const { generateCertificatePdf, getEstablishmentLogo } = require('../services/pdfService');
const { sendPasswordResetEmail } = require('../services/emailService');
const { mapTypeEtablissement, getTimeAgo, createNotification } = require('../utils/helpers');
const { encryptPrivateKey, decryptPrivateKey, sha256Hex } = require('../utils/cryptoUtils');
const { requireActiveSubscription, checkEmissionQuota } = require('../middleware/subscription');

const router = express.Router();

// ========================================
// ROUTES POUR STATISTIQUES DE VÉRIFICATION
// ========================================

// Enregistrer une vérification de certificat
router.post('/api/certificats/:uuid/verify', async (req, res) => {
  try {
    const { uuid } = req.params;
    const { verificationType = 'public' } = req.body;
    
    // Trouver le certificat par UUID
    const certificat = await prisma.certificat.findUnique({
      where: { uuid }
    });
    
    if (!certificat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificat introuvable' 
      });
    }
    
    // Enregistrer la vérification
    const verification = await prisma.verificationStat.create({
      data: {
        certificatId: certificat.id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        verificationType
      }
    });
    
    console.log(`📊 Vérification enregistrée pour le certificat ${uuid} (ID: ${verification.id})`);
    
    // Créer une notification pour l'établissement (limiter à une notification toutes les 24h pour éviter le spam)
    const derniere24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const notificationRecente = await prisma.notification.findFirst({
      where: {
        userId: certificat.etablissementId,
        userType: 'etablissement',
        type: 'VERIFICATION_CERTIFICAT',
        createdAt: { gte: derniere24h }
      }
    });

    if (!notificationRecente) {
      const countToday = await prisma.verificationStat.count({
        where: {
          certificat: {
            etablissementId: certificat.etablissementId
          },
          verifiedAt: { gte: derniere24h }
        }
      });

      await createNotification({
        userId: certificat.etablissementId,
        userType: 'etablissement',
        type: 'VERIFICATION_CERTIFICAT',
        titre: 'Nouvelles vérifications',
        message: `${countToday} vérification${countToday > 1 ? 's' : ''} de vos certificats aujourd'hui`,
        important: false,
        lienAction: '/dashboard?userType=establishment',
        metadonnees: { count: countToday }
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Vérification enregistrée',
      data: { verificationId: verification.id }
    });
    
  } catch (error) {
    console.error('❌ Erreur enregistrement vérification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'enregistrement de la vérification',
      error: error.message 
    });
  }
});

// Obtenir les statistiques de vérification d'un certificat
router.get('/api/certificats/:id/verification-stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Vérifier que l'utilisateur peut accéder à ces statistiques
    const certificat = await prisma.certificat.findUnique({
      where: { id: parseInt(id) },
      include: {
        etablissement: true,
        apprenant: true
      }
    });
    
    if (!certificat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificat introuvable' 
      });
    }
    
    // Vérifier les permissions
    if (userRole === 'establishment' && certificat.etablissementId !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé' 
      });
    }
    
    if (userRole === 'student' && certificat.apprenantId !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé' 
      });
    }
    
    // Récupérer les statistiques
    const stats = await prisma.verificationStat.findMany({
      where: { certificatId: parseInt(id) },
      orderBy: { verifiedAt: 'desc' },
      take: 50 // Limiter à 50 dernières vérifications
    });
    
    const totalVerifications = await prisma.verificationStat.count({
      where: { certificatId: parseInt(id) }
    });
    
    res.json({ 
      success: true, 
      data: {
        totalVerifications,
        recentVerifications: stats,
        certificat: {
          id: certificat.id,
          uuid: certificat.uuid,
          titre: certificat.titre
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération statistiques:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message 
    });
  }
});

// ========================================
// ROUTES POUR CERTIFICATS
// ========================================

// Créer un brouillon de certificat
router.post('/api/certificats', authenticateToken, requireRole('establishment'), async (req, res) => {
  try {
    const { apprenantId, titre, mention, dateObtention, formationId } = req.body;
    const etablissementId = req.user.id;

    if (!apprenantId || !titre || !dateObtention) {
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    }

    // ✅ Protection contre les doublons : vérifier s'il existe déjà un brouillon identique récent
    const existingDraft = await prisma.certificat.findFirst({
      where: {
        etablissementId,
        apprenantId: parseInt(apprenantId),
        titre,
        dateObtention: new Date(dateObtention),
        statut: 'BROUILLON',
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Dans les 5 dernières minutes
        }
      }
    });

    if (existingDraft) {
      console.log('⚠️ Brouillon identique trouvé récemment, retour du brouillon existant');
      return res.status(200).json({ success: true, data: existingDraft });
    }

    // Vérifier que l'apprenant est lié (approuvé) à l'établissement
    const liaison = await prisma.liaisonApprenantEtablissement.findFirst({
      where: { apprenantId: parseInt(apprenantId), etablissementId, statutLiaison: 'APPROUVE' }
    });
    if (!liaison) {
      return res.status(403).json({ success: false, message: 'Apprenant non lié à votre établissement' });
    }

    const uuid = uuidv4();
    // Vérifier que la formation appartient à l'établissement si fournie
    if (formationId) {
      const formation = await prisma.formation.findFirst({
        where: { id: parseInt(formationId), etablissementId }
      });
      if (!formation) {
        return res.status(400).json({ 
          success: false, 
          message: 'Formation non trouvée ou n\'appartient pas à votre établissement' 
        });
      }
    }

    const certificat = await prisma.certificat.create({
      data: {
        uuid,
        etablissementId,
        apprenantId: parseInt(apprenantId),
        formationId: formationId ? parseInt(formationId) : null,
        titre,
        mention: mention || null,
        dateObtention: new Date(dateObtention),
        statut: 'BROUILLON'
      }
    });

    console.log('✅ Nouveau brouillon créé:', certificat.id);
    res.status(201).json({ success: true, data: certificat });
  } catch (error) {
    console.error('❌ Erreur création brouillon certificat:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// Générer le PDF et calculer le hash
router.post('/api/certificats/:id/pdf', authenticateToken, requireRole('establishment'), async (req, res) => {
  try {
    const { id } = req.params;
    const etablissementId = req.user.id;

    const certificat = await prisma.certificat.findUnique({
      where: { id: parseInt(id) },
      include: {
        apprenant: true,
        etablissement: true,
        formation: true
      }
    });
    if (!certificat || certificat.etablissementId !== etablissementId) {
      return res.status(404).json({ success: false, message: 'Certificat introuvable' });
    }

    // URL de vérification selon l'environnement
    const { getVerifyUrl } = require('../config/environments');
    const verifyBaseUrl = getVerifyUrl();
    const { publicUrl, hashHex } = await generateCertificatePdf({
      certificat,
      apprenant: certificat.apprenant,
      etablissement: certificat.etablissement,
      formation: certificat.formation,
      verifyBaseUrl: verifyBaseUrl.endsWith('/') ? verifyBaseUrl : verifyBaseUrl + '/'
    });

    const updated = await prisma.certificat.update({
      where: { id: certificat.id },
      data: { pdfUrl: publicUrl, pdfHash: hashHex }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('❌ Erreur génération PDF:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// Émettre un certificat on-chain (version robuste avec gestion d'échecs)
router.post('/api/certificats/:id/emit', authenticateToken, requireRole('establishment'), requireActiveSubscription, checkEmissionQuota, async (req, res) => {
  try {
    const { id } = req.params;
    const etablissementId = req.user.id;

    const certificat = await prisma.certificat.findUnique({ where: { id: parseInt(id) } });
    if (!certificat || certificat.etablissementId !== etablissementId) {
      return res.status(404).json({ success: false, message: 'Certificat introuvable' });
    }
    if (!certificat.pdfHash) {
      return res.status(400).json({ success: false, message: 'PDF non généré' });
    }

    // Vérifier que le certificat peut être émis
    if (certificat.statut !== 'BROUILLON' && certificat.statut !== 'EMISSION_ECHEC') {
      return res.status(400).json({ success: false, message: 'Seuls les certificats brouillons ou avec émission échouée peuvent être émis' });
    }

    // Limiter le nombre de tentatives
    if (certificat.emissionAttempts >= 3) {
      return res.status(400).json({ success: false, message: 'Nombre maximum de tentatives d\'émission atteint' });
    }

    // Marquer comme "en cours d'émission" immédiatement
    await prisma.certificat.update({
      where: { id: parseInt(id) },
      data: { 
        statut: 'EN_COURS_EMISSION',
        emissionAttempts: { increment: 1 },
        lastEmissionAttempt: new Date()
      }
    });

    const rpcUrl = process.env.CHAIN_RPC_URL;
    const contractAddress = process.env.CERT_CONTRACT_ADDRESS;
    if (!rpcUrl || !contractAddress) {
      // Marquer comme échec si config manquante
      await prisma.certificat.update({
        where: { id: parseInt(id) },
        data: { statut: 'EMISSION_ECHEC' }
      });
      return res.status(500).json({ success: false, message: 'Config blockchain manquante' });
    }

    // Vérifier que le wallet relayer (trésorerie plateforme) est configuré
    if (!process.env.RELAYER_PRIVATE_KEY) {
      await prisma.certificat.update({
        where: { id: parseInt(id) },
        data: { statut: 'EMISSION_ECHEC' }
      });
      return res.status(500).json({ success: false, message: 'Wallet relayer non configuré (RELAYER_PRIVATE_KEY)' });
    }

    // Charger la clé chiffrée de l'établissement (sert UNIQUEMENT à signer, hors-chaîne)
    const vault = await prisma.walletVault.findFirst({ 
      where: { ownerType: 'etablissement', ownerId: etablissementId } 
    });
    if (!vault) {
      await prisma.certificat.update({
        where: { id: parseInt(id) },
        data: { statut: 'EMISSION_ECHEC' }
      });
      return res.status(500).json({ success: false, message: 'Clé établissement manquante (vault)' });
    }

    let establishmentPrivateKey;
    try {
      establishmentPrivateKey = decryptPrivateKey({ iv: vault.iv, authTag: vault.authTag, cipherText: vault.cipherText });
    } catch (e) {
      console.error('❌ Erreur déchiffrement clé établissement:', e);
      await prisma.certificat.update({
        where: { id: parseInt(id) },
        data: { statut: 'EMISSION_ECHEC' }
      });
      return res.status(500).json({ success: false, message: 'Erreur déchiffrement clé établissement' });
    }

    // Préparer le destinataire (wallet étudiant)
    let recipient = ethers.ZeroAddress;
    try {
      const apprenant = await prisma.apprenant.findUnique({ where: { id_apprenant: certificat.apprenantId } });
      if (apprenant) {
        if (apprenant.walletAddress) {
          recipient = apprenant.walletAddress;
        } else {
          // Générer un wallet si manquant (MVP) et stocker
          const newWallet = ethers.Wallet.createRandom();
          const enc = encryptPrivateKey(newWallet.privateKey);
          const updatedApprenant = await prisma.apprenant.update({
            where: { id_apprenant: apprenant.id_apprenant },
            data: { walletAddress: newWallet.address }
          });
          const existingVault = await prisma.walletVault.findFirst({
            where: { ownerType: 'apprenant', ownerId: updatedApprenant.id_apprenant }
          });
          if (!existingVault) {
            await prisma.walletVault.create({
              data: {
                ownerType: 'apprenant',
                ownerId: updatedApprenant.id_apprenant,
                iv: enc.iv,
                authTag: enc.authTag,
                cipherText: enc.cipherText
              }
            });
          }
          recipient = newWallet.address;
        }
      }
    } catch (e) {
      console.error('❌ Erreur préparation wallet étudiant:', e);
    }

    // Convertir le hash PDF en bytes32
    const hashHexRaw = certificat.pdfHash.startsWith('0x') ? certificat.pdfHash : '0x' + certificat.pdfHash;
    if (hashHexRaw.length !== 66) {
      await prisma.certificat.update({
        where: { id: parseInt(id) },
        data: { statut: 'EMISSION_ECHEC' }
      });
      return res.status(400).json({ success: false, message: 'Hash PDF invalide' });
    }

    // Vérifier l'idempotence (déjà émis on-chain)
    try {
      const already = await blockchain.isIssued(contractAddress, hashHexRaw);
      if (already) {
        const updated = await prisma.certificat.update({
          where: { id: certificat.id },
          data: { 
            statut: 'EMIS', 
            contractAddress,
            emissionTxHash: 'ALREADY_ISSUED',
            issuedAt: new Date()
          }
        });
        return res.json({ 
          success: true, 
          data: updated, 
          message: 'Certificat déjà émis on-chain',
          onChainEmitted: true
        });
      }
    } catch (e) {
      console.error('❌ Erreur vérification idempotence:', e);
    }

    // Émission on-chain via relayer : l'établissement signe (gratuit), le relayer paie le gas
    let txHash = null;
    let onChainSuccess = false;
    
    try {
      console.log(`🚀 Émission on-chain (relayer) du certificat ${id}...`);

      // 1) Signature hors-chaîne par l'établissement (aucun coût)
      const { signature, issuer } = await blockchain.signCertificate(hashHexRaw, recipient, establishmentPrivateKey);

      // 2) Le relayer soumet la transaction et paie le gas
      txHash = await blockchain.issueViaRelayer({
        contractAddress,
        pdfHash: hashHexRaw,
        student: recipient,
        issuer,
        signature
      });
      onChainSuccess = true;
      console.log(`✅ Émission on-chain réussie: ${txHash}`);
      
    } catch (onChainError) {
      console.error('❌ Erreur émission on-chain:', onChainError);
      onChainSuccess = false;
    }

    // Mise à jour du statut final selon le succès de l'émission on-chain
    const finalStatut = onChainSuccess ? 'EMIS' : 'EMISSION_ECHEC';
    
    const updated = await prisma.certificat.update({
      where: { id: certificat.id },
      data: {
        statut: finalStatut,
        txHash: txHash,
        emissionTxHash: txHash,
        contractAddress: contractAddress,
        issuedAt: onChainSuccess ? new Date() : null
      }
    });

    // Créer une notification pour l'étudiant si l'émission a réussi
    if (onChainSuccess) {
      await createNotification({
        userId: certificat.apprenantId,
        userType: 'apprenant',
        type: 'NOUVEAU_CERTIFICAT',
        titre: 'Nouveau certificat disponible',
        message: `Votre certificat "${certificat.titre}" a été émis et est maintenant disponible`,
        important: true,
        lienAction: '/dashboard?userType=student',
        metadonnees: { certificatId: certificat.id, uuid: certificat.uuid }
      });
    }

    res.json({
      success: true,
      message: onChainSuccess ? 'Certificat émis avec succès' : 'Émission échouée (blockchain)',
      data: updated,
      onChainEmitted: onChainSuccess,
      canRetry: !onChainSuccess && certificat.emissionAttempts < 3
    });

  } catch (error) {
    console.error('❌ Erreur émission on-chain:', error);
    
    // Marquer comme échec en cas d'erreur générale
    try {
      await prisma.certificat.update({
        where: { id: parseInt(req.params.id) },
        data: { statut: 'EMISSION_ECHEC' }
      });
    } catch (updateError) {
      console.error('❌ Erreur mise à jour statut:', updateError);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur émission on-chain', 
      error: error.message 
    });
  }
});

// Vérifier on-chain un certificat (lecture-only)
router.get('/api/certificats/:id/verify-onchain', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    const certificat = await prisma.certificat.findUnique({ where: { id: parseInt(id) } });
    if (!certificat) {
      return res.status(404).json({ success: false, message: 'Certificat introuvable' });
    }

    // Contrôle d'accès: établissement propriétaire ou apprenant destinataire
    if (userRole === 'establishment' && certificat.etablissementId !== userId) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }
    if (userRole === 'student' && certificat.apprenantId !== userId) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    if (!certificat.pdfHash) {
      return res.json({ success: true, data: { onchain: false, reason: 'Aucun hash' } });
    }

    const rpcUrl = process.env.CHAIN_RPC_URL;
    const contractAddress = process.env.CERT_CONTRACT_ADDRESS;
    if (!rpcUrl || !contractAddress) {
      return res.status(500).json({ success: false, message: 'Config blockchain manquante' });
    }

    const provider = blockchain.getProvider(rpcUrl);
    const abi = [
      'function isIssued(bytes32 pdfHash) external view returns (bool)',
      'function getRecord(bytes32 pdfHash) external view returns (address issuer, address student, uint256 issuedAt)'
    ];
    const contract = new ethers.Contract(contractAddress, abi, provider);

    const hashHexRaw = certificat.pdfHash.startsWith('0x') ? certificat.pdfHash : '0x' + certificat.pdfHash;
    if (hashHexRaw.length !== 66) {
      return res.json({ success: true, data: { onchain: false, reason: 'Hash invalide' } });
    }

    const onchain = await contract.isIssued(hashHexRaw);
    if (!onchain) {
      return res.json({ success: true, data: { onchain: false } });
    }

    let record = null;
    try {
      const r = await contract.getRecord(hashHexRaw);
      record = { issuer: r.issuer, student: r.student, issuedAt: Number(r.issuedAt) * 1000 };
    } catch {}

    return res.json({ success: true, data: { onchain: true, record, contractAddress, txHash: certificat.txHash || null } });
  } catch (error) {
    console.error('❌ Erreur vérification on-chain:', error);
    res.status(500).json({ success: false, message: 'Erreur vérification on-chain', error: error.message });
  }
});

// Route pour re-publier un certificat (en cas d'échec blockchain)
router.post('/api/certificats/:id/retry-emit', authenticateToken, requireRole('establishment'), requireActiveSubscription, checkEmissionQuota, async (req, res) => {
  try {
    const { id } = req.params;
    const etablissementId = req.user.id;

    const certificat = await prisma.certificat.findUnique({ where: { id: parseInt(id) } });
    if (!certificat || certificat.etablissementId !== etablissementId) {
      return res.status(404).json({ success: false, message: 'Certificat introuvable' });
    }

    // Vérifier que le certificat peut être re-publié (BROUILLON ou EMISSION_ECHEC)
    if (certificat.statut !== 'EMISSION_ECHEC' && certificat.statut !== 'BROUILLON') {
      return res.status(400).json({ success: false, message: 'Seuls les certificats brouillons ou avec émission échouée peuvent être re-publiés' });
    }

    // Limiter le nombre de tentatives
    if (certificat.emissionAttempts >= 3) {
      return res.status(400).json({ success: false, message: 'Nombre maximum de tentatives d\'émission atteint' });
    }

    // Marquer comme "en cours d'émission" à nouveau
    await prisma.certificat.update({
      where: { id: parseInt(id) },
      data: { 
        statut: 'EN_COURS_EMISSION',
        emissionAttempts: { increment: 1 },
        lastEmissionAttempt: new Date()
      }
    });

    // Utiliser la même logique que l'émission normale
    const rpcUrl = process.env.CHAIN_RPC_URL;
    const contractAddress = process.env.CERT_CONTRACT_ADDRESS;
    if (!rpcUrl || !contractAddress) {
      await prisma.certificat.update({
        where: { id: parseInt(id) },
        data: { statut: 'EMISSION_ECHEC' }
      });
      return res.status(500).json({ success: false, message: 'Config blockchain manquante' });
    }

    if (!process.env.RELAYER_PRIVATE_KEY) {
      await prisma.certificat.update({
        where: { id: parseInt(id) },
        data: { statut: 'EMISSION_ECHEC' }
      });
      return res.status(500).json({ success: false, message: 'Wallet relayer non configuré (RELAYER_PRIVATE_KEY)' });
    }

    const vault = await prisma.walletVault.findFirst({ 
      where: { ownerType: 'etablissement', ownerId: etablissementId } 
    });
    if (!vault) {
      await prisma.certificat.update({
        where: { id: parseInt(id) },
        data: { statut: 'EMISSION_ECHEC' }
      });
      return res.status(500).json({ success: false, message: 'Clé établissement manquante' });
    }

    let establishmentPrivateKey;
    try {
      establishmentPrivateKey = decryptPrivateKey({ iv: vault.iv, authTag: vault.authTag, cipherText: vault.cipherText });
    } catch (e) {
      await prisma.certificat.update({
        where: { id: parseInt(id) },
        data: { statut: 'EMISSION_ECHEC' }
      });
      return res.status(500).json({ success: false, message: 'Erreur déchiffrement clé établissement' });
    }

    // Préparer le destinataire
    let recipient = ethers.ZeroAddress;
    try {
      const apprenant = await prisma.apprenant.findUnique({ where: { id_apprenant: certificat.apprenantId } });
      if (apprenant?.walletAddress) {
        recipient = apprenant.walletAddress;
      }
    } catch (e) {
      console.error('❌ Erreur préparation wallet étudiant:', e);
    }

    // Convertir le hash PDF
    const hashHexRaw = certificat.pdfHash.startsWith('0x') ? certificat.pdfHash : '0x' + certificat.pdfHash;
    if (hashHexRaw.length !== 66) {
      await prisma.certificat.update({
        where: { id: parseInt(id) },
        data: { statut: 'EMISSION_ECHEC' }
      });
      return res.status(400).json({ success: false, message: 'Hash PDF invalide' });
    }

    // Vérifier l'idempotence
    try {
      const already = await blockchain.isIssued(contractAddress, hashHexRaw);
      if (already) {
        const updated = await prisma.certificat.update({
          where: { id: certificat.id },
          data: { 
            statut: 'EMIS', 
            contractAddress,
            emissionTxHash: 'ALREADY_ISSUED',
            issuedAt: new Date()
          }
        });
        return res.json({ 
          success: true, 
          data: updated, 
          message: 'Certificat déjà émis on-chain',
          onChainEmitted: true
        });
      }
    } catch (e) {
      console.error('❌ Erreur vérification idempotence:', e);
    }

    // Re-émission on-chain via relayer (établissement signe, relayer paie le gas)
    let txHash = null;
    let onChainSuccess = false;
    
    try {
      console.log(`🔄 Re-émission on-chain (relayer) du certificat ${id}...`);

      const { signature, issuer } = await blockchain.signCertificate(hashHexRaw, recipient, establishmentPrivateKey);
      txHash = await blockchain.issueViaRelayer({
        contractAddress,
        pdfHash: hashHexRaw,
        student: recipient,
        issuer,
        signature
      });
      onChainSuccess = true;
      console.log(`✅ Re-émission on-chain réussie: ${txHash}`);
      
    } catch (onChainError) {
      console.error('❌ Erreur re-émission on-chain:', onChainError);
      onChainSuccess = false;
    }

    // Mise à jour du statut final
    const finalStatut = onChainSuccess ? 'EMIS' : 'EMISSION_ECHEC';
    
    const updated = await prisma.certificat.update({
      where: { id: certificat.id },
      data: {
        statut: finalStatut,
        txHash: txHash,
        emissionTxHash: txHash,
        contractAddress: contractAddress,
        issuedAt: onChainSuccess ? new Date() : null
      }
    });

    res.json({
      success: true,
      message: onChainSuccess ? 'Certificat re-publié avec succès' : 'Re-publication échouée',
      data: updated,
      onChainEmitted: onChainSuccess,
      canRetry: !onChainSuccess && certificat.emissionAttempts < 3
    });

  } catch (error) {
    console.error('❌ Erreur re-publication certificat:', error);
    
    try {
      await prisma.certificat.update({
        where: { id: parseInt(req.params.id) },
        data: { statut: 'EMISSION_ECHEC' }
      });
    } catch (updateError) {
      console.error('❌ Erreur mise à jour statut:', updateError);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la re-publication', 
      error: error.message 
    });
  }
});

// Route pour révoquer un certificat (établissement/admin uniquement)
router.post('/api/certificats/:id/revoke', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Vérifier les permissions
    if (req.user.role !== 'establishment' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const certificat = await prisma.certificat.findUnique({
      where: { id: parseInt(id) },
      include: { etablissement: true, apprenant: true }
    });

    if (!certificat) {
      return res.status(404).json({ success: false, message: 'Certificat non trouvé' });
    }

    // Vérifier que l'établissement est propriétaire du certificat (sauf admin)
    if (req.user.role === 'establishment' && certificat.etablissementId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez révoquer que vos propres certificats' });
    }

    // Vérifier que le certificat est émis
    if (certificat.statut !== 'EMIS') {
      return res.status(400).json({ success: false, message: 'Seuls les certificats émis peuvent être révoqués' });
    }

    // Marquer comme "en cours de révocation" immédiatement
    await prisma.certificat.update({
      where: { id: parseInt(id) },
      data: { 
        statut: 'EN_COURS_REVOCATION',
        revocationReason: reason || 'Certificat révoqué par l\'établissement',
        revocationAttempts: { increment: 1 },
        lastRevocationAttempt: new Date()
      }
    });

    // Révocation on-chain
    let txHash = null;
    let onChainSuccess = false;
    
    if (certificat.pdfHash && certificat.contractAddress) {
      try {
        console.log(`🔗 Révocation on-chain du certificat ${id}...`);
        
        // Configuration blockchain
        if (!process.env.CHAIN_RPC_URL) {
          throw new Error('Config blockchain manquante');
        }
        if (!process.env.RELAYER_PRIVATE_KEY) {
          throw new Error('Wallet relayer non configuré (RELAYER_PRIVATE_KEY)');
        }

        // Récupérer la clé privée de l'établissement (signature hors-chaîne uniquement)
        const walletVault = await prisma.walletVault.findFirst({
          where: { 
            ownerType: 'etablissement',
            ownerId: certificat.etablissementId
          }
        });

        if (walletVault) {
          const privateKey = decryptPrivateKey(walletVault);

          // Convertir le hash PDF en bytes32 (ajouter 0x si nécessaire et vérifier la longueur)
          const hashHexRaw = certificat.pdfHash.startsWith('0x') ? certificat.pdfHash : '0x' + certificat.pdfHash;
          console.log(`🔍 Hash PDF formaté: ${hashHexRaw} (longueur: ${hashHexRaw.length})`);
          
          if (hashHexRaw.length !== 66) {
            throw new Error(`Hash PDF invalide: ${hashHexRaw} (longueur: ${hashHexRaw.length})`);
          }

          // 1) L'établissement signe la révocation (gratuit)
          const { signature } = await blockchain.signRevocation(hashHexRaw, privateKey);

          // 2) Le relayer soumet la transaction et paie le gas
          txHash = await blockchain.revokeViaRelayer({
            contractAddress: certificat.contractAddress,
            pdfHash: hashHexRaw,
            reason: reason || 'Certificat révoqué par l\'établissement',
            signature
          });
          onChainSuccess = true;
          console.log(`✅ Révocation on-chain réussie: ${txHash}`);
        } else {
          console.warn(`⚠️ Wallet de l'établissement non trouvé pour la révocation on-chain`);
        }
      } catch (onChainError) {
        console.error('❌ Erreur révocation on-chain:', onChainError);
        onChainSuccess = false;
      }
    }

    // Mise à jour du statut final selon le succès de la révocation on-chain
    const finalStatut = onChainSuccess ? 'REVOQUE' : 'REVOQUE_ECHEC';
    
    await prisma.certificat.update({
      where: { id: parseInt(id) },
      data: { 
        statut: finalStatut,
        revocationTxHash: txHash
      }
    });

    console.log(`✅ Certificat ${id} révoqué par ${req.user.role} ${req.user.id}`);

    res.json({
      success: true,
      message: onChainSuccess ? 'Certificat révoqué avec succès' : 'Certificat révoqué localement (révocation blockchain échouée)',
      data: {
        certificatId: parseInt(id),
        statut: finalStatut,
        revokedAt: new Date().toISOString(),
        revokedBy: req.user.role,
        reason: reason || null,
        txHash: txHash,
        onChainRevoked: onChainSuccess,
        canRetry: !onChainSuccess
      }
    });

  } catch (error) {
    console.error('❌ Erreur révocation certificat:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la révocation', error: error.message });
  }
});

// Route pour re-révoquer un certificat (en cas d'échec blockchain)
router.post('/api/certificats/:id/retry-revoke', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Vérifier les permissions
    if (req.user.role !== 'establishment' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    const certificat = await prisma.certificat.findUnique({
      where: { id: parseInt(id) },
      include: { etablissement: true, apprenant: true }
    });

    if (!certificat) {
      return res.status(404).json({ success: false, message: 'Certificat non trouvé' });
    }

    // Vérifier que l'établissement est propriétaire du certificat (sauf admin)
    if (req.user.role === 'establishment' && certificat.etablissementId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez révoquer que vos propres certificats' });
    }

    // Vérifier que le certificat peut être re-révoqué
    if (certificat.statut !== 'REVOQUE_ECHEC') {
      return res.status(400).json({ success: false, message: 'Seuls les certificats avec révocation échouée peuvent être re-révoqués' });
    }

    // Limiter le nombre de tentatives
    if (certificat.revocationAttempts >= 6) {
      return res.status(400).json({ success: false, message: 'Nombre maximum de tentatives de révocation atteint' });
    }

    // Marquer comme "en cours de révocation" à nouveau
    await prisma.certificat.update({
      where: { id: parseInt(id) },
      data: { 
        statut: 'EN_COURS_REVOCATION',
        revocationReason: reason || certificat.revocationReason,
        revocationAttempts: { increment: 1 },
        lastRevocationAttempt: new Date()
      }
    });

    // Révocation on-chain (même logique que la révocation normale)
    let txHash = null;
    let onChainSuccess = false;
    
    if (certificat.pdfHash && certificat.contractAddress) {
      try {
        console.log(`🔄 Re-révocation on-chain du certificat ${id}...`);
        
        // Configuration blockchain
        if (!process.env.CHAIN_RPC_URL) {
          throw new Error('Config blockchain manquante');
        }
        if (!process.env.RELAYER_PRIVATE_KEY) {
          throw new Error('Wallet relayer non configuré (RELAYER_PRIVATE_KEY)');
        }

        const walletVault = await prisma.walletVault.findFirst({
          where: { 
            ownerType: 'etablissement',
            ownerId: certificat.etablissementId
          }
        });

        if (walletVault) {
          const privateKey = decryptPrivateKey(walletVault);

          // Convertir le hash PDF en bytes32 (ajouter 0x si nécessaire et vérifier la longueur)
          const hashHexRaw = certificat.pdfHash.startsWith('0x') ? certificat.pdfHash : '0x' + certificat.pdfHash;
          console.log(`🔍 Hash PDF formaté: ${hashHexRaw} (longueur: ${hashHexRaw.length})`);
          
          if (hashHexRaw.length !== 66) {
            throw new Error(`Hash PDF invalide: ${hashHexRaw} (longueur: ${hashHexRaw.length})`);
          }

          // L'établissement signe (gratuit), le relayer soumet et paie le gas
          const { signature } = await blockchain.signRevocation(hashHexRaw, privateKey);
          txHash = await blockchain.revokeViaRelayer({
            contractAddress: certificat.contractAddress,
            pdfHash: hashHexRaw,
            reason: reason || certificat.revocationReason || 'Certificat révoqué par l\'établissement',
            signature
          });
          onChainSuccess = true;
          console.log(`✅ Re-révocation on-chain réussie: ${txHash}`);
        }
      } catch (onChainError) {
        console.error('❌ Erreur re-révocation on-chain:', onChainError);
        onChainSuccess = false;
      }
    }

    // Mise à jour du statut final
    const finalStatut = onChainSuccess ? 'REVOQUE' : 'REVOQUE_ECHEC';
    
    await prisma.certificat.update({
      where: { id: parseInt(id) },
      data: { 
        statut: finalStatut,
        revocationTxHash: txHash
      }
    });

    res.json({
      success: true,
      message: onChainSuccess ? 'Certificat re-révoqué avec succès' : 'Re-révocation échouée',
      data: {
        certificatId: parseInt(id),
        statut: finalStatut,
        revokedAt: new Date().toISOString(),
        revokedBy: req.user.role,
        reason: reason || certificat.revocationReason,
        txHash: txHash,
        onChainRevoked: onChainSuccess,
        canRetry: !onChainSuccess && certificat.revocationAttempts < 3
      }
    });

  } catch (error) {
    console.error('❌ Erreur re-révocation certificat:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la re-révocation', error: error.message });
  }
});

// Lister les certificats (établissement: les siens, étudiant: les siens)
router.get('/api/certificats', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    let where = {};
    if (role === 'establishment') where = { etablissementId: userId };
    else if (role === 'student') where = { apprenantId: userId };
    else return res.status(403).json({ success: false, message: 'Non autorisé' });

    const certificats = await prisma.certificat.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        formation: {
          select: {
            id: true,
            nomFormation: true,
            typeFormation: true
          }
        },
        etablissement: {
          select: {
            id_etablissement: true,
            nomEtablissement: true,
            typeEtablissement: true
          }
        },
        apprenant: {
          select: {
            id_apprenant: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        _count: {
          select: {
            verificationStats: true
          }
        }
      }
    });
    res.json({ success: true, data: certificats });
  } catch (error) {
    console.error('❌ Erreur listing certificats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// Endpoint public pour vérifier par uuid
router.get('/api/certificats/public/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const certificat = await prisma.certificat.findUnique({ where: { uuid } });
    if (!certificat) return res.status(404).json({ success: false, message: 'Inconnu' });
    
    // Si le certificat est révoqué en base, retourner cette info
    if (certificat.statut === 'REVOQUE') {
      return res.json({ 
        success: true, 
        data: {
          ...certificat,
          revoked: true,
          revokedAt: certificat.createdAt, // Utiliser createdAt comme date de révocation temporaire
          revocationReason: 'Certificat révoqué par l\'établissement'
        }
      });
    }
    
    res.json({ success: true, data: certificat });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// Endpoint public: vérifier on-chain par uuid
router.get('/api/certificats/public/:uuid/verify', async (req, res) => {
  try {
    const { uuid } = req.params;
    const certificat = await prisma.certificat.findUnique({ where: { uuid } });
    if (!certificat) return res.status(404).json({ success: false, message: 'Inconnu' });

    if (!certificat.pdfHash) {
      return res.json({ success: true, data: { onchain: false, reason: 'Aucun hash' } });
    }

    const rpcUrl = process.env.CHAIN_RPC_URL;
    const contractAddress = process.env.CERT_CONTRACT_ADDRESS;
    if (!rpcUrl || !contractAddress) {
      return res.status(500).json({ success: false, message: 'Config blockchain manquante' });
    }

    const provider = blockchain.getProvider(rpcUrl);
    const abi = [
      'function isIssued(bytes32 pdfHash) external view returns (bool)',
      'function isRevoked(bytes32 pdfHash) external view returns (bool)',
      'function getRecord(bytes32 pdfHash) external view returns (address issuer, address student, uint256 issuedAt)',
      'function getRevocationInfo(bytes32 pdfHash) external view returns (bool revoked, uint256 revokedAt, string memory reason)'
    ];
    const contract = new ethers.Contract(contractAddress, abi, provider);

    const hashHexRaw = certificat.pdfHash.startsWith('0x') ? certificat.pdfHash : '0x' + certificat.pdfHash;
    if (hashHexRaw.length !== 66) {
      return res.json({ success: true, data: { onchain: false, reason: 'Hash invalide' } });
    }

    const onchain = await contract.isIssued(hashHexRaw);
    if (!onchain) {
      return res.json({ success: true, data: { onchain: false } });
    }

    // Vérifier si le certificat est révoqué
    const revoked = await contract.isRevoked(hashHexRaw);
    if (revoked) {
      const revocationInfo = await contract.getRevocationInfo(hashHexRaw);
      return res.json({ 
        success: true, 
        data: { 
          onchain: true, 
          revoked: true,
          revokedAt: revocationInfo.revokedAt.toString(),
          revocationReason: revocationInfo.reason,
          contractAddress, 
          txHash: certificat.txHash || null 
        } 
      });
    }

    let record = null;
    try {
      const r = await contract.getRecord(hashHexRaw);
      record = { issuer: r.issuer, student: r.student, issuedAt: Number(r.issuedAt) * 1000 };
    } catch {}

    return res.json({ success: true, data: { onchain: true, revoked: false, record, contractAddress, txHash: certificat.txHash || null } });
  } catch (error) {
    console.error('❌ Erreur vérification on-chain publique:', error);
    res.status(500).json({ success: false, message: 'Erreur vérification on-chain', error: error.message });
  }
});
module.exports = router;
