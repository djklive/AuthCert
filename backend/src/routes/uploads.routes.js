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

// Endpoint pour servir les fichiers depuis Supabase
router.get('/api/uploads/certificats/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    console.log(`🔍 Recherche du fichier certificat: ${filename}`);
    
    // Le fichier est stocké avec le chemin complet dans la base de données
    // Récupérer le certificat pour obtenir le bon chemin
    const certificat = await prisma.certificat.findFirst({
      where: {
        pdfUrl: {
          contains: filename
        }
      }
    });
    
    if (!certificat || !certificat.pdfUrl) {
      console.log(`❌ Certificat non trouvé pour le fichier: ${filename}`);
      return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    }
    
    // Extraire le chemin du fichier depuis l'URL Supabase
    const urlParts = certificat.pdfUrl.split('/');
    const filePath = urlParts.slice(-2).join('/'); // Prendre les 2 dernières parties (certificats/filename)
    
    console.log(`📁 Chemin du fichier: ${filePath}`);
    
    // Générer une URL signée pour le fichier
    const result = await supabaseStorage.getSignedUrl(filePath, 3600); // 1 heure
    
    if (!result.success) {
      console.log(`❌ Erreur génération URL signée: ${result.error}`);
      return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    }
    
    console.log(`✅ URL signée générée: ${result.url}`);
    
    // Rediriger vers l'URL signée Supabase
    res.redirect(result.url);
    
  } catch (error) {
    console.error('❌ Erreur serveur fichier:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour servir les fichiers d'établissements depuis Supabase
router.get('/api/uploads/etablissements/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Générer une URL signée pour le fichier
    const filePath = `etablissements/${filename}`;
    const result = await supabaseStorage.getSignedUrl(filePath, 3600); // 1 heure
    
    if (!result.success) {
      return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    }
    
    // Rediriger vers l'URL signée Supabase
    res.redirect(result.url);
    
  } catch (error) {
    console.error('❌ Erreur serveur fichier:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ===============================================
//                UPLOAD FICHIERS SUPABASE
// ===============================================

// Route pour upload direct vers Supabase
router.post('/api/upload/supabase', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const { folder = 'uploads' } = req.body;
    const file = req.file;

    // Upload vers Supabase
    const uploadResult = await supabaseStorage.uploadFile(
      file.buffer,
      file.originalname,
      folder,
      file.mimetype
    );

    if (uploadResult.success) {
      res.json({
        success: true,
        message: 'Fichier uploadé avec succès',
        data: {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          url: uploadResult.url,
          path: uploadResult.path
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'upload',
        error: uploadResult.error
      });
    }

  } catch (error) {
    console.error('❌ Erreur upload Supabase:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'upload',
      error: error.message
    });
  }
});
module.exports = router;
