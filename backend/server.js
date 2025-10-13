require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { createEtablissementUpload, cleanupFiles, getFileInfo } = require('./utils/uploadHandler');
const { 
  generateToken, 
  authenticateToken, 
  requireRole, 
  requireStatus,
  createSession,
  cleanupExpiredSessions,
  terminateAllOtherSessions,
  getLocationFromIP
} = require('./config/jwt');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { ethers } = require('ethers');
const { sendPasswordResetEmail } = require('./services/emailService');

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;

// Configuration multer pour l'upload de fichiers
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max par fichier
    files: 5 // Maximum 5 fichiers
  },
  fileFilter: (req, file, cb) => {
    // Types de fichiers autorisés
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'), false);
    }
  }
});

// Fonction utilitaire pour mapper les types d'établissement
function mapTypeEtablissement(typeString) {
  const typeMap = {
    'Université publique': 'UNIVERSITE_PUBLIQUE',
    'Université privée': 'UNIVERSITE_PRIVEE',
    'Institut supérieur': 'INSTITUT_SUPERIEUR',
    'École technique': 'ECOLE_TECHNIQUE',
    'Centre de formation': 'CENTRE_FORMATION',
    'Autre': 'AUTRE',
    // Support pour les valeurs déjà mappées
    'UNIVERSITE_PUBLIQUE': 'UNIVERSITE_PUBLIQUE',
    'UNIVERSITE_PRIVEE': 'UNIVERSITE_PRIVEE',
    'INSTITUT_SUPERIEUR': 'INSTITUT_SUPERIEUR',
    'ECOLE_TECHNIQUE': 'ECOLE_TECHNIQUE',
    'CENTRE_FORMATION': 'CENTRE_FORMATION',
    'AUTRE': 'AUTRE'
  };
  
  return typeMap[typeString] || 'AUTRE';
}

// Middleware
app.use(cors());
app.use(express.json());

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Dossier uploads créé');
}

// Créer le dossier etablissements s'il n'existe pas
const etablissementsDir = path.join(uploadsDir, 'etablissements');
if (!fs.existsSync(etablissementsDir)) {
  fs.mkdirSync(etablissementsDir, { recursive: true });
  console.log('📁 Dossier etablissements créé');
}

// Créer le dossier certificats s'il n'existe pas
const certificatsDir = path.join(uploadsDir, 'certificats');
if (!fs.existsSync(certificatsDir)) {
  fs.mkdirSync(certificatsDir, { recursive: true });
  console.log('📁 Dossier certificats créé');
}

// Endpoint pour servir les fichiers depuis Supabase
app.get('/api/uploads/certificats/:filename', async (req, res) => {
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
app.get('/api/uploads/etablissements/:filename', async (req, res) => {
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

// Utilitaires Certificats
function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// === Wallet encryption helpers (AES-256-GCM) ===
function getWalletEncryptionKey() {
  const raw = process.env.WALLET_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('WALLET_ENCRYPTION_KEY manquant dans les variables d\'environnement');
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return crypto.createHash('sha256').update(raw).digest();
}

function encryptPrivateKey(plainTextPrivateKey) {
  const key = getWalletEncryptionKey();
  const iv = crypto.randomBytes(12); // GCM IV 96-bit
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainTextPrivateKey, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    cipherText: encrypted.toString('base64')
  };
}

function decryptPrivateKey(encryptedObject) {
  const key = getWalletEncryptionKey();
  const iv = Buffer.from(encryptedObject.iv, 'base64');
  const authTag = Buffer.from(encryptedObject.authTag, 'base64');
  const cipherText = Buffer.from(encryptedObject.cipherText, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return decrypted.toString('utf8');
}

// Import du service Supabase au niveau du module
const supabaseStorage = require('./services/supabaseStorage');

// Fonction pour récupérer le logo de l'établissement
async function getEstablishmentLogo(etablissementId) {
  try {
    // Récupérer le document logo de l'établissement
    const logoDocument = await prisma.documentEtablissement.findFirst({
      where: {
        etablissementId: etablissementId,
        typeDocument: 'LOGO_ETABLISSEMENT',
        statut: 'VALIDE'
      }
    });

    if (logoDocument && logoDocument.cheminFichier) {
      // Vérifier si c'est déjà une URL publique ou un chemin de fichier
      if (logoDocument.cheminFichier.startsWith('http')) {
        console.log(`✅ Logo URL publique trouvée: ${logoDocument.cheminFichier}`);
        return logoDocument.cheminFichier; // URL publique directe
      } else {
        // Récupérer l'URL signée depuis Supabase pour les chemins de fichiers
        const result = await supabaseStorage.getSignedUrl(logoDocument.cheminFichier);
        
        if (result.success) {
          console.log(`✅ Logo URL signée générée: ${result.url}`);
          return result.url;
        } else {
          console.log(`❌ Erreur URL signée logo: ${result.error}`);
          return null;
        }
      }
    }
    
    console.log(`ℹ️ Aucun logo trouvé pour l'établissement ${etablissementId}`);
    return null;
  } catch (error) {
    console.error('❌ Erreur récupération logo:', error);
    return null;
  }
}

async function generateCertificatePdf({
  certificat,
  apprenant,
  etablissement,
  formation,
  verifyBaseUrl
}) {
  return new Promise(async (resolve, reject) => {
    try {
      const uuid = certificat.uuid;
      const fileName = `${uuid}.pdf`;

      // QR vers la page publique de vérification
      const verifyUrl = `${verifyBaseUrl}?uuid=${encodeURIComponent(uuid)}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { 
        margin: 2, 
        width: 200,
        color: {
          dark: '#1f2937',  // Gris foncé
          light: '#ffffff'  // Blanc
        }
      });

      // Récupérer le logo de l'établissement
      let logoUrl = null;
      try {
        logoUrl = await getEstablishmentLogo(etablissement.id_etablissement);
        console.log(`🖼️ Logo URL: ${logoUrl || 'Aucun logo'}`);
      } catch (logoError) {
        console.warn('⚠️ Erreur récupération logo, utilisation du placeholder:', logoError.message);
        logoUrl = null;
      }

      // Configuration du document PDF
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 0,
        info: {
          Title: `Certificat - ${certificat.titre}`,
          Author: etablissement.nomEtablissement,
          Subject: formation ? formation.nomFormation : 'Certificat de formation',
          Creator: 'AuthCert Platform'
        }
      });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          const hashHex = sha256Hex(pdfBuffer);

          // Upload vers Supabase Storage
          const uploadResult = await supabaseStorage.uploadFile(
            pdfBuffer,
            fileName,
            'certificats',
            'application/pdf'
          );

          if (!uploadResult.success) {
            throw new Error(`Erreur upload Supabase: ${uploadResult.error}`);
          }

          console.log(`✅ PDF généré et uploadé: ${uploadResult.url}`);
          resolve({ 
            filePath: uploadResult.path, 
            publicUrl: uploadResult.url, 
            hashHex 
          });

        } catch (error) {
          console.error('❌ Erreur upload PDF:', error);
          console.error('❌ Erreur upload PDF:', error.message);
          console.error('❌ Erreur upload PDF:', error.stack);
          console.error('❌ Erreur upload PDF:', error.code);
          console.error('❌ Erreur upload PDF:', error.details);
          console.error('❌ Erreur upload PDF:', error.hint);
          reject(error);
        }
      });

      // ===========================================
      // DESIGN PROFESSIONNEL DU CERTIFICAT
      // ===========================================

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 60;

      // Couleurs de la marque
      const primaryColor = '#F43F5E';  // Rose principal
      const secondaryColor = '#1f2937'; // Gris foncé
      const accentColor = '#6b7280';   // Gris moyen
      const lightGray = '#f9fafb';     // Gris très clair

      // ===========================================
      // ARRIÈRE-PLAN ET BORDURE
      // ===========================================
      
      // Bordure décorative
      doc.rect(margin - 10, margin - 10, pageWidth - 2 * margin + 20, pageHeight - 2 * margin + 20)
         .lineWidth(3)
         .stroke(primaryColor);

      // Bordure intérieure
      doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin)
         .lineWidth(1)
         .stroke(accentColor);

      // ===========================================
      // EN-TÊTE AVEC LOGO
      // ===========================================
      
      const headerY = margin + 30;
      
      // Logo de l'établissement
      if (logoUrl) {
        try {
          console.log(`🔄 Téléchargement du logo: ${logoUrl}`);
          // Télécharger le logo depuis Supabase
          const logoResponse = await fetch(logoUrl);
          if (logoResponse.ok) {
            const logoArrayBuffer = await logoResponse.arrayBuffer();
            const logoBuffer = Buffer.from(logoArrayBuffer);
            doc.image(logoBuffer, pageWidth / 2 - 30, headerY - 10, { width: 60, height: 60 });
            console.log(`✅ Logo chargé avec succès`);
          } else {
            throw new Error(`Logo non accessible: ${logoResponse.status} ${logoResponse.statusText}`);
          }
        } catch (error) {
          console.warn('⚠️ Impossible de charger le logo, utilisation du placeholder:', error.message);
          // Fallback vers le placeholder
          doc.circle(pageWidth / 2, headerY + 20, 30)
             .fill(primaryColor);
          
          doc.fontSize(16)
             .fillColor('white')
             .text('🏆', pageWidth / 2 - 15, headerY + 5, { width: 30, align: 'center' });
        }
      } else {
        console.log(`ℹ️ Aucun logo fourni, utilisation du placeholder`);
        // Placeholder par défaut
        doc.circle(pageWidth / 2, headerY + 20, 30)
           .fill(primaryColor);
        
        doc.fontSize(16)
           .fillColor('white')
           .text('🏆', pageWidth / 2 - 15, headerY + 5, { width: 30, align: 'center' });
      }

      // Nom de l'établissement
      doc.fontSize(18)
         .fillColor(secondaryColor)
         .text(etablissement.nomEtablissement, margin, headerY + 60, { 
           width: pageWidth - 2 * margin, 
           align: 'center',
           lineGap: 2
         });

      // Ligne de séparation
      doc.moveTo(margin + 50, headerY + 100)
         .lineTo(pageWidth - margin - 50, headerY + 100)
         .lineWidth(2)
         .stroke(primaryColor);

      // ===========================================
      // TITRE PRINCIPAL
      // ===========================================
      
      const titleY = headerY + 130;
      
      doc.fontSize(12)
         .fillColor(accentColor)
         .text(formation.nomFormation, margin, titleY, { 
           width: pageWidth - 2 * margin, 
           align: 'center' 
         });

      doc.fontSize(28)
         .fillColor(secondaryColor)
         .text(certificat.titre, margin, titleY + 20, { 
           width: pageWidth - 2 * margin, 
           align: 'center',
           lineGap: 5
         });

      // ===========================================
      // NOM DU RÉCIPIENDAIRE
      // ===========================================
      
      const recipientY = titleY + 100;
      
      doc.fontSize(14)
         .fillColor(accentColor)
         .text('Décerné à', margin, recipientY, { 
           width: pageWidth - 2 * margin, 
           align: 'center' 
         });

      doc.fontSize(24)
         .fillColor(primaryColor)
         .text(`${apprenant.prenom} ${apprenant.nom}`, margin, recipientY + 25, { 
           width: pageWidth - 2 * margin, 
           align: 'center',
           lineGap: 3
         });

      // ===========================================
      // DÉTAILS DU CERTIFICAT
      // ===========================================
      
      const detailsY = recipientY + 80;
      const detailsWidth = (pageWidth - 2 * margin) / 2;
      
      // Colonne gauche
      doc.fontSize(12)
         .fillColor(secondaryColor)
         .text('Date d\'obtention:', margin, detailsY)
         .text(new Date(certificat.dateObtention).toLocaleDateString('fr-FR', {
           year: 'numeric',
           month: 'long',
           day: 'numeric'
         }), margin + 130, detailsY);

      if (certificat.mention) {
        doc.text('Mention:', margin, detailsY + 25)
           .text(certificat.mention, margin + 130, detailsY + 25);
      }

      // Colonne droite - QR Code
      const qrX = pageWidth - margin - 120;
      const qrY = detailsY - 10;
      
      // Intégrer le QR code
      const qrBase64 = qrDataUrl.replace(/^data:image\/(png|jpg);base64,/, '');
      const qrBuffer = Buffer.from(qrBase64, 'base64');
      doc.image(qrBuffer, qrX, qrY, { width: 100, height: 100 });

      // Texte sous le QR
      doc.fontSize(8)
         .fillColor(accentColor)
         .text('Vérifiez l\'authenticité', qrX, qrY + 105, { width: 100, align: 'center' })
         .text('en scannant ce code', qrX, qrY + 115, { width: 100, align: 'center' });

      // ===========================================
      // FOOTER
      // ===========================================
      
      const footerY = pageHeight - margin - 80;
      
      // Ligne de séparation
      doc.moveTo(margin + 50, footerY - 20)
         .lineTo(pageWidth - margin - 50, footerY - 20)
         .lineWidth(1)
         .stroke(accentColor);

      // Informations de vérification
      doc.fontSize(8)
         .fillColor(accentColor)
         .text(`Identifiant unique: ${uuid}`, margin, footerY, { width: pageWidth - 2 * margin, align: 'center' })
         .text(`Vérification: ${verifyUrl}`, margin, footerY + 12, { width: pageWidth - 2 * margin, align: 'center' })
         .text('Ce certificat est sécurisé par la technologie blockchain', margin, footerY + 24, { width: pageWidth - 2 * margin, align: 'center' })
         .text('© 2025 AuthCert Platform - Tous droits réservés', margin, footerY + 36, { width: pageWidth - 2 * margin, align: 'center' });

      // ===========================================
      // ÉLÉMENTS DÉCORATIFS
      // ===========================================
      
      // Coins décoratifs
      const cornerSize = 20;
      const cornerThickness = 3;
      
      // Coin supérieur gauche
      doc.moveTo(margin, margin + cornerSize)
         .lineTo(margin, margin)
         .lineTo(margin + cornerSize, margin)
         .lineWidth(cornerThickness)
         .stroke(primaryColor);
      
      // Coin supérieur droit
      doc.moveTo(pageWidth - margin - cornerSize, margin)
         .lineTo(pageWidth - margin, margin)
         .lineTo(pageWidth - margin, margin + cornerSize)
         .lineWidth(cornerThickness)
         .stroke(primaryColor);
      
      // Coin inférieur gauche
      doc.moveTo(margin, pageHeight - margin - cornerSize)
         .lineTo(margin, pageHeight - margin)
         .lineTo(margin + cornerSize, pageHeight - margin)
         .lineWidth(cornerThickness)
         .stroke(primaryColor);
      
      // Coin inférieur droit
      doc.moveTo(pageWidth - margin - cornerSize, pageHeight - margin)
         .lineTo(pageWidth - margin, pageHeight - margin)
         .lineTo(pageWidth - margin, pageHeight - margin - cornerSize)
         .lineWidth(cornerThickness)
         .stroke(primaryColor);

      doc.end();

    } catch (e) {
      reject(e);
      console.error('❌ Erreur génération PDF:', e);
    }
  });
}

// Route d'inscription d'un apprenant
app.post('/api/register/apprenant', async (req, res) => {
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

// Route d'inscription d'un établissement
app.post('/api/register/etablissement', async (req, res) => {
  try {
    console.log('🚀 Début inscription établissement');
    console.log('📋 Body reçu:', JSON.stringify(req.body, null, 2));
    
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
      telephoneResponsableEtablissement,
      documents
    } = req.body;
    
    // Mapping des types d'établissement frontend vers backend
    const typeEtablissementMapping = {
      'Université publique': 'UNIVERSITE_PUBLIQUE',
      'Université privée': 'UNIVERSITE_PRIVEE',
      'Institut supérieur': 'INSTITUT_SUPERIEUR',
      'École technique': 'ECOLE_TECHNIQUE',
      'Centre de formation': 'CENTRE_FORMATION',
      'Autre': 'AUTRE'
    };
    
    // Convertir le type d'établissement
    const typeEtablissementBackend = typeEtablissementMapping[typeEtablissement];
    if (!typeEtablissementBackend) {
      return res.status(400).json({
        success: false,
        message: 'Type d\'établissement invalide'
      });
    }
    
    console.log('🔄 Type d\'établissement converti:', typeEtablissement, '→', typeEtablissementBackend);
    
    console.log('🔍 Données extraites:', {
      nomEtablissement,
      emailEtablissement,
      rccmEtablissement,
      typeEtablissement: `${typeEtablissement} → ${typeEtablissementBackend}`,
      adresseEtablissement,
      telephoneEtablissement,
      nomResponsableEtablissement,
      emailResponsableEtablissement,
      telephoneResponsableEtablissement,
      hasDocuments: !!documents
    });

    // Validation des champs requis
    console.log('✅ Validation des champs...');
    if (!nomEtablissement || !emailEtablissement || !motDePasseEtablissement || 
        !rccmEtablissement || !typeEtablissement || !adresseEtablissement || 
        !telephoneEtablissement || !nomResponsableEtablissement || 
        !emailResponsableEtablissement || !telephoneResponsableEtablissement) {
      console.log('❌ Validation échouée - champs manquants');
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis'
      });
    }
    console.log('✅ Validation réussie');

    // Vérification si l'email existe déjà
    console.log('🔍 Vérification email existant...');
    const existingEtablissement = await prisma.etablissement.findUnique({
      where: { emailEtablissement }
    });

    if (existingEtablissement) {
      console.log('❌ Email déjà existant');
      return res.status(409).json({
        success: false,
        message: 'Un établissement avec cet email existe déjà'
      });
    }
    console.log('✅ Email disponible');

    // Hashage du mot de passe
    console.log('🔐 Hashage du mot de passe...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(motDePasseEtablissement, salt);
    console.log('✅ Mot de passe hashé');

    // Création de l'établissement
    console.log('🏗️ Création de l\'établissement en base...');
    const etablissement = await prisma.etablissement.create({
      data: {
        nomEtablissement,
        emailEtablissement,
        motDePasseEtablissement: hashedPassword,
        rccmEtablissement,
        typeEtablissement: typeEtablissementBackend, // Utiliser la valeur convertie
        adresseEtablissement,
        telephoneEtablissement,
        nomResponsableEtablissement,
        emailResponsableEtablissement,
        telephoneResponsableEtablissement,
        statut: 'EN_ATTENTE',
        dateCreation: new Date(),
        dateModification: new Date()
      }
    });

    // Log des informations des documents pour vérification
    if (documents) {
      console.log('📋 Documents reçus pour l\'établissement:', documents);
      console.log('📁 RCCM:', documents.rccm?.nom);
      console.log('📁 Autorisation:', documents.autorisation?.nom);
      console.log('📁 Pièce d\'identité:', documents.pieceIdentite?.nom);
      console.log('📁 Logo:', documents.logo?.nom);
      console.log('📁 Plaquette:', documents.plaquette?.nom);
    }

    // Sauvegarder les métadonnées des documents dans la base
    if (documents) {
      const documentsToSave = [];
      
      // Documents obligatoires
      if (documents.rccm) {
        documentsToSave.push({
          etablissementId: etablissement.id_etablissement,
          typeDocument: 'rccm',
          nomFichier: documents.rccm.nom,
          typeMime: documents.rccm.type,
          tailleFichier: documents.rccm.taille,
          cheminFichier: `uploads/etablissements/${etablissement.id_etablissement}/rccm_${Date.now()}.${documents.rccm.type.split('/')[1]}`
        });
      }
      
      if (documents.autorisation) {
        documentsToSave.push({
          etablissementId: etablissement.id_etablissement,
          typeDocument: 'autorisation',
          nomFichier: documents.autorisation.nom,
          typeMime: documents.autorisation.type,
          tailleFichier: documents.autorisation.taille,
          cheminFichier: `uploads/etablissements/${etablissement.id_etablissement}/autorisation_${Date.now()}.${documents.autorisation.type.split('/')[1]}`
        });
      }
      
      if (documents.pieceIdentite) {
        documentsToSave.push({
          etablissementId: etablissement.id_etablissement,
          typeDocument: 'pieceIdentite',
          nomFichier: documents.pieceIdentite.nom,
          typeMime: documents.pieceIdentite.type,
          tailleFichier: documents.pieceIdentite.taille,
          cheminFichier: `uploads/etablissements/${etablissement.id_etablissement}/pieceIdentite_${Date.now()}.${documents.pieceIdentite.type.split('/')[1]}`
        });
      }
      
      // Documents optionnels
      if (documents.logo) {
        documentsToSave.push({
          etablissementId: etablissement.id_etablissement,
          typeDocument: 'logo',
          nomFichier: documents.logo.nom,
          typeMime: documents.logo.type,
          tailleFichier: documents.logo.taille,
          cheminFichier: `uploads/etablissements/${etablissement.id_etablissement}/logo_${Date.now()}.${documents.logo.type.split('/')[1]}`
        });
      }
      
      if (documents.plaquette) {
        documentsToSave.push({
          etablissementId: etablissement.id_etablissement,
          typeDocument: 'plaquette',
          nomFichier: documents.plaquette.nom,
          typeMime: documents.plaquette.type,
          tailleFichier: documents.plaquette.taille,
          cheminFichier: `uploads/etablissements/${etablissement.id_etablissement}/plaquette_${Date.now()}.${documents.plaquette.type.split('/')[1]}`
        });
      }
      
      // Sauvegarder tous les documents
      if (documentsToSave.length > 0) {
        try {
          await prisma.documentEtablissement.createMany({
            data: documentsToSave
          });
          console.log(`✅ ${documentsToSave.length} documents sauvegardés en base`);
        } catch (error) {
          console.error('❌ Erreur lors de la sauvegarde des documents:', error);
          // Ne pas faire échouer l'inscription pour une erreur de documents
        }
      }
    }

    console.log('✅ Établissement créé avec succès, ID:', etablissement.id_etablissement);

    // Suppression du mot de passe de la réponse
    const { motDePasseEtablissement: _, ...etablissementSansMotDePasse } = etablissement;

    res.status(201).json({
      success: true,
      message: 'Demande d\'inscription établissement soumise avec succès ! Votre compte sera validé sous 48-72h.',
      data: etablissementSansMotDePasse
    });

  } catch (error) {
    console.error('❌ Erreur inscription établissement:', error);
    console.error('📋 Détails de l\'erreur:', error.message);
    console.error('🔍 Stack trace:', error.stack);
    
    // Vérifier si c'est une erreur Prisma
    if (error.code) {
      console.error('📊 Code erreur Prisma:', error.code);
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du compte établissement',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Route d'inscription d'un établissement AVEC upload physique des fichiers
app.post('/api/register/etablissement/upload', async (req, res) => {
  try {
    console.log('🚀 Début inscription établissement avec upload physique');
    
    // Créer l'upload Multer avec un ID temporaire
    // On utilisera un timestamp pour éviter les conflits
    const tempId = `temp_${Date.now()}`;
    const upload = createEtablissementUpload(tempId);
    
    // Middleware pour traiter l'upload
    upload.fields([
      { name: 'rccmDocument', maxCount: 1 },
      { name: 'autorisation', maxCount: 1 },
      { name: 'pieceIdentite', maxCount: 1 },
      { name: 'logo', maxCount: 1 },
      { name: 'plaquette', maxCount: 1 }
    ])(req, res, async (err) => {
      if (err) {
        console.error('❌ Erreur upload:', err);
        return res.status(400).json({
          success: false,
          message: `Erreur upload: ${err.message}`
        });
      }
      
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
        
        const files = req.files;
        
        console.log('📋 Données reçues:', {
          nomEtablissement,
          emailEtablissement,
          rccmEtablissement,
          typeEtablissement,
          hasFiles: !!files
        });
        
        // Log détaillé des fichiers reçus
        if (files) {
          console.log('📁 Fichiers reçus:', Object.keys(files));
          Object.keys(files).forEach(fieldName => {
            const fileArray = files[fieldName];
            if (Array.isArray(fileArray) && fileArray.length > 0) {
              const file = fileArray[0];
              console.log(`📄 ${fieldName}:`, {
                nom: file.originalname,
                type: file.mimetype,
                taille: file.size,
                chemin: file.path
              });
            }
          });
        } else {
          console.log('❌ Aucun fichier reçu');
        }
        
        // Mapping des types d'établissement
        const typeEtablissementMapping = {
          'Université publique': 'UNIVERSITE_PUBLIQUE',
          'Université privée': 'UNIVERSITE_PRIVEE',
          'Institut supérieur': 'INSTITUT_SUPERIEUR',
          'École technique': 'ECOLE_TECHNIQUE',
          'Centre de formation': 'CENTRE_FORMATION',
          'Autre': 'AUTRE'
        };
        
        const typeEtablissementBackend = typeEtablissementMapping[typeEtablissement];
        if (!typeEtablissementBackend) {
          cleanupFiles(files);
          return res.status(400).json({
            success: false,
            message: 'Type d\'établissement invalide'
          });
        }
        
        // Validation des champs
        if (!nomEtablissement || !emailEtablissement || !motDePasseEtablissement || 
            !rccmEtablissement || !typeEtablissement || !adresseEtablissement || 
            !telephoneEtablissement || !nomResponsableEtablissement || 
            !emailResponsableEtablissement || !telephoneResponsableEtablissement) {
          cleanupFiles(files);
          return res.status(400).json({
            success: false,
            message: 'Tous les champs obligatoires doivent être remplis'
          });
        }
        
        // Vérification email existant
        const existingEtablissement = await prisma.etablissement.findUnique({
          where: { emailEtablissement }
        });
        
        if (existingEtablissement) {
          cleanupFiles(files);
          return res.status(409).json({
            success: false,
            message: 'Un établissement avec cet email existe déjà'
          });
        }
        
        // Hashage du mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(motDePasseEtablissement, salt);
        
        // Création de l'établissement
        const etablissement = await prisma.etablissement.create({
          data: {
            nomEtablissement,
            emailEtablissement,
            motDePasseEtablissement: hashedPassword,
            rccmEtablissement,
            typeEtablissement: typeEtablissementBackend,
            adresseEtablissement,
            telephoneEtablissement,
            nomResponsableEtablissement,
            emailResponsableEtablissement,
            telephoneResponsableEtablissement,
            statut: 'EN_ATTENTE',
            dateCreation: new Date(),
            dateModification: new Date()
          }
        });
        
        console.log('✅ Établissement créé, ID:', etablissement.id_etablissement);
        
        // Déplacer les fichiers du dossier temporaire vers le dossier final
        if (files) {
          const documentsToSave = [];
          const tempDir = path.join(__dirname, 'uploads/etablissements', tempId);
          const finalDir = path.join(__dirname, 'uploads/etablissements', etablissement.id_etablissement.toString());
          
          // Créer le dossier final s'il n'existe pas
          if (!fs.existsSync(finalDir)) {
            fs.mkdirSync(finalDir, { recursive: true });
            console.log(`📁 Dossier final créé: ${finalDir}`);
          }
          
          // Traiter chaque type de document
          Object.keys(files).forEach(fieldName => {
            const fileArray = files[fieldName];
            if (Array.isArray(fileArray) && fileArray.length > 0) {
              const file = fileArray[0];
              
              console.log(`📁 Fichier traité: ${fieldName} - ${file.originalname}`);
              
              // Déplacer le fichier vers le dossier final
              const fileName = path.basename(file.path);
              const finalPath = path.join(finalDir, fileName);
              
              try {
                fs.renameSync(file.path, finalPath);
                console.log(`✅ Fichier déplacé: ${fileName} → ${finalPath}`);
                
                // Préparer les données pour la base
                documentsToSave.push({
                  etablissementId: etablissement.id_etablissement,
                  typeDocument: fieldName,
                  nomFichier: file.originalname,
                  typeMime: file.mimetype,
                  tailleFichier: file.size,
                  cheminFichier: path.relative(__dirname, finalPath)
                });
              } catch (moveError) {
                console.error('❌ Erreur déplacement fichier:', moveError);
                // En cas d'erreur, utiliser le chemin temporaire
                documentsToSave.push({
                  etablissementId: etablissement.id_etablissement,
                  typeDocument: fieldName,
                  nomFichier: file.originalname,
                  typeMime: file.mimetype,
                  tailleFichier: file.size,
                  cheminFichier: path.relative(__dirname, file.path)
                });
              }
            }
          });
          
          // Sauvegarder les métadonnées en base
          if (documentsToSave.length > 0) {
            try {
              await prisma.documentEtablissement.createMany({
                data: documentsToSave
              });
              console.log(`✅ ${documentsToSave.length} documents sauvegardés en base`);
            } catch (error) {
              console.error('❌ Erreur sauvegarde documents:', error);
              console.error('📊 Détails erreur:', error.message);
            }
          }
          
          // Nettoyer le dossier temporaire
          try {
            if (fs.existsSync(tempDir)) {
              fs.rmSync(tempDir, { recursive: true, force: true });
              console.log(`🗑️ Dossier temporaire supprimé: ${tempDir}`);
            }
          } catch (cleanupError) {
            console.error('⚠️ Erreur nettoyage dossier temporaire:', cleanupError);
          }
        }
        
        // Réponse de succès
        const { motDePasseEtablissement: _, ...etablissementSansMotDePasse } = etablissement;
        
        res.status(201).json({
          success: true,
          message: 'Demande d\'inscription établissement soumise avec succès ! Votre compte sera validé sous 48-72h.',
          data: etablissementSansMotDePasse
        });
        
      } catch (error) {
        // Nettoyer les fichiers en cas d'erreur
        cleanupFiles(files);
        throw error;
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur inscription établissement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du compte établissement',
      error: error.message
    });
  }
});

// Route pour vérifier la validité du token
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
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

// Route pour récupérer tous les établissements (pour l'admin)
app.get('/api/admin/etablissements', authenticateToken, requireRole('admin'), async (req, res) => {
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

// Route pour recuperer tous les etablissements (page d'accueil)
app.get('/api/accueil/etablissements', async (req, res) => {
  try {
    console.log('🔍 Récupération des établissements...');
    
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
    
    console.log(`✅ ${etablissements.length} établissements trouvés:`, etablissements.map(e => ({ nom: e.nomEtablissement, statut: e.statut })));
    
    res.json({
      success: true,
      data: etablissements
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération établissements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des établissements',
      error: error.message
    });
  }
});

// Route pour récupérer les documents d'un établissement
app.get('/api/etablissement/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    
    const documents = await prisma.documentEtablissement.findMany({
      where: { etablissementId: parseInt(id) },
      select: {
        id: true,
        typeDocument: true,
        nomFichier: true,
        typeMime: true,
        tailleFichier: true,
        cheminFichier: true,
        statut: true,
        dateUpload: true,
        dateValidation: true,
        commentaires: true
      },
      orderBy: { dateUpload: 'desc' }
    });
    
    res.json({
      success: true,
      data: documents
    });
    
  } catch (error) {
    console.error('Erreur récupération documents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des documents',
      error: error.message
    });
  }
});

// Route de connexion pour tous les utilisateurs
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }

         // Connexion administrateur
     if (role === 'admin') {
       if (email === 'frckdjoko@gmail.com' && password === '123456') {
         const userData = {
           id: 1,
           email: email,
           role: 'admin',
           nom: 'Administrateur'
         };
         
         const token = generateToken(userData);
         
         // Créer une session pour l'admin
         try {
           await createSession(1, 'admin', token, req);
         } catch (sessionError) {
           console.error('❌ Erreur création session admin:', sessionError);
           // On continue même si la session échoue
         }
         
         return res.json({
           success: true,
           user: userData,
           token: token
         });
       } else {
         return res.status(401).json({
           success: false,
           message: 'Identifiants administrateur incorrects'
         });
       }
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
app.post('/api/auth/forgot-password', async (req, res) => {
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
app.post('/api/auth/reset-password', async (req, res) => {
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
app.get('/api/auth/verify-reset-token/:token', async (req, res) => {
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

// Route d'inscription d'un établissement AVEC Supabase Storage - Système Adaptatif
app.post('/api/register/etablissement/supabase', async (req, res) => {
  try {
    console.log('🚀 Début inscription établissement avec Supabase Storage - Système Adaptatif');
    console.log('📋 Body reçu:', JSON.stringify(req.body, null, 2));
    
    const {
      nomEtablissement,
      emailEtablissement,
      motDePasseEtablissement,
      typeOrganisation, // Nouveau champ
      rccmEtablissement,
      typeEtablissement,
      adresseEtablissement,
      telephoneEtablissement,
      nomResponsableEtablissement,
      emailResponsableEtablissement,
      telephoneResponsableEtablissement,
      // Nouveaux champs spécifiques selon le type d'organisation
      niu,
      numeroAgrement,
      arreteCreation,
      ministereTutelle,
      documents // URLs des fichiers Supabase
    } = req.body;
    
    // Validation du type d'organisation
    const validTypesOrganisation = ['ETABLISSEMENT_ENSEIGNEMENT', 'CENTRE_FORMATION_PROFESSIONNELLE', 'ENTREPRISE'];
    if (!typeOrganisation || !validTypesOrganisation.includes(typeOrganisation)) {
      return res.status(400).json({
        success: false,
        message: 'Type d\'organisation invalide. Types valides: ETABLISSEMENT_ENSEIGNEMENT, CENTRE_FORMATION_PROFESSIONNELLE, ENTREPRISE'
      });
    }
    
    console.log('🏢 Type d\'organisation:', typeOrganisation);
    
    // Mapping des types d'établissement frontend vers backend
    const typeEtablissementMapping = {
      'Université publique': 'UNIVERSITE_PUBLIQUE',
      'Université privée': 'UNIVERSITE_PRIVEE',
      'Institut supérieur': 'INSTITUT_SUPERIEUR',
      'École technique': 'ECOLE_TECHNIQUE',
      'Centre de formation': 'CENTRE_FORMATION',
      'Autre': 'AUTRE'
    };
    
    // Convertir le type d'établissement
    const typeEtablissementBackend = typeEtablissementMapping[typeEtablissement];
    if (!typeEtablissementBackend) {
      return res.status(400).json({
        success: false,
        message: 'Type d\'établissement invalide'
      });
    }
    
    console.log('🔄 Type d\'établissement converti:', typeEtablissement, '→', typeEtablissementBackend);
    
    // Validation adaptative selon le type d'organisation
    console.log('✅ Validation adaptative selon le type d\'organisation...');
    
    // Validation des champs spécifiques selon le type d'organisation
    if (typeOrganisation === 'ETABLISSEMENT_ENSEIGNEMENT') {
      if (!arreteCreation || !ministereTutelle) {
        return res.status(400).json({
          success: false,
          message: 'Pour les établissements d\'enseignement, les champs "Référence Arrêté de Création" et "Ministère de Tutelle" sont obligatoires'
        });
      }
    } else if (typeOrganisation === 'CENTRE_FORMATION_PROFESSIONNELLE') {
      if (!rccmEtablissement || !niu || !numeroAgrement) {
        return res.status(400).json({
          success: false,
          message: 'Pour les centres de formation professionnelle, les champs "RCCM", "NIU" et "Numéro d\'Agrément" sont obligatoires'
        });
      }
    } else if (typeOrganisation === 'ENTREPRISE') {
      if (!rccmEtablissement) {
        return res.status(400).json({
          success: false,
          message: 'Pour les entreprises, le champ "RCCM" est obligatoire'
        });
      }
    }
    
    // Validation des champs requis (adaptative selon le type d'organisation)
    console.log('✅ Validation des champs...');
    
    // Champs communs obligatoires
    const champsCommunsObligatoires = [
      nomEtablissement, emailEtablissement, motDePasseEtablissement,
      typeEtablissement, adresseEtablissement, telephoneEtablissement,
      nomResponsableEtablissement, emailResponsableEtablissement, telephoneResponsableEtablissement
    ];
    
    // RCCM obligatoire seulement pour certains types
    if (typeOrganisation === 'CENTRE_FORMATION_PROFESSIONNELLE' || typeOrganisation === 'ENTREPRISE') {
      champsCommunsObligatoires.push(rccmEtablissement);
    }
    
    if (champsCommunsObligatoires.some(champ => !champ)) {
      console.log('❌ Validation échouée - champs manquants');
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis'
      });
    }
    console.log('✅ Validation réussie');

    // Vérification si l'email existe déjà
    console.log('🔍 Vérification email existant...');
    const existingEtablissement = await prisma.etablissement.findUnique({
      where: { emailEtablissement }
    });

    if (existingEtablissement) {
      console.log('❌ Email déjà existant');
      return res.status(409).json({
        success: false,
        message: 'Un établissement avec cet email existe déjà'
      });
    }
    console.log('✅ Email disponible');

    // Hashage du mot de passe
    console.log('🔐 Hashage du mot de passe...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(motDePasseEtablissement, salt);
    console.log('✅ Mot de passe hashé');

    // Générer un wallet établissement et stocker la clé privée chiffrée
    let walletAddress = null;
    try {
      const wallet = ethers.Wallet.createRandom();
      walletAddress = wallet.address;
      const enc = encryptPrivateKey(wallet.privateKey);
      // on enregistrera WalletVault après avoir créé l'établissement pour avoir son id
      var encForVault = enc;
    } catch (e) {
      console.error('❌ Erreur génération wallet établissement:', e);
      return res.status(500).json({ success: false, message: 'Erreur création du portefeuille établissement' });
    }

    // Création de l'établissement
    console.log('🏗️ Création de l\'établissement en base...');
    const etablissement = await prisma.etablissement.create({
      data: {
        nomEtablissement,
        emailEtablissement,
        motDePasseEtablissement: hashedPassword,
        typeOrganisation: typeOrganisation, // Nouveau champ
        rccmEtablissement: rccmEtablissement || null, // RCCM conditionnel
        typeEtablissement: typeEtablissementBackend,
        adresseEtablissement,
        telephoneEtablissement,
        nomResponsableEtablissement,
        emailResponsableEtablissement,
        telephoneResponsableEtablissement,
        statut: 'EN_ATTENTE',
        dateCreation: new Date(),
        dateModification: new Date(),
        // Nouveaux champs spécifiques selon le type d'organisation
        niu: niu || null,
        numeroAgrement: numeroAgrement || null,
        arreteCreation: arreteCreation || null,
        ministereTutelle: ministereTutelle || null,
        // si vous souhaitez stocker une addresse publique d'admin pour l'établissement (optionnel)
        // walletAddressEtablissement: walletAddress,
      }
    });

    // Sauvegarder la clé privée chiffrée dans le coffre-fort pour l'établissement
    try {
      await prisma.walletVault.create({
        data: {
          ownerType: 'etablissement',
          ownerId: etablissement.id_etablissement,
          iv: encForVault.iv,
          authTag: encForVault.authTag,
          cipherText: encForVault.cipherText
        }
      });
    } catch (e) {
      console.error('❌ Erreur enregistrement coffre-fort établissement:', e);
      // on ne bloque pas l'inscription, mais on signale
    }

    // Log des URLs des documents Supabase
    if (documents) {
      console.log('📋 URLs des documents Supabase reçus:', documents);
      console.log('🏢 Type d\'organisation:', typeOrganisation);
    }

    // Sauvegarder les URLs des documents Supabase dans la base (adaptatif selon le type d'organisation)
    if (documents) {
      const documentsToSave = [];
      
      // Fonction helper pour créer un document
      const createDocument = (typeDocument, nomFichier, url) => {
        if (url) {
          documentsToSave.push({
            etablissementId: etablissement.id_etablissement,
            typeDocument: typeDocument,
            nomFichier: nomFichier,
            typeMime: 'application/pdf',
            tailleFichier: 0, // Taille non disponible depuis Supabase
            cheminFichier: url, // URL Supabase
            statut: 'EN_ATTENTE',
            dateUpload: new Date()
          });
        }
      };
      
      // Documents selon le type d'organisation
      if (typeOrganisation === 'ETABLISSEMENT_ENSEIGNEMENT') {
        // Documents pour établissements d'enseignement
        createDocument('ARRETE_CREATION', 'Arrêté de Création', documents.arreteCreation);
        createDocument('AUTORISATION_EXERCER', 'Autorisation d\'Exercer', documents.autorisationExercer);
        createDocument('CNI_REPRESENTANT', 'CNI du Chef d\'Établissement', documents.cniRepresentant);
        createDocument('LETTRE_NOMINATION', 'Lettre de Nomination', documents.lettreNomination);
      } else if (typeOrganisation === 'CENTRE_FORMATION_PROFESSIONNELLE') {
        // Documents pour centres de formation professionnelle
        createDocument('RCCM', 'Document RCCM', documents.rccmDocument);
        createDocument('NIU', 'Carte NIU', documents.niu);
        createDocument('AGREMENT_MINEFOP', 'Agrément MINEFOP', documents.agrementMinefop);
        createDocument('CNI_REPRESENTANT', 'CNI du Gérant/Directeur', documents.cniRepresentant);
        createDocument('POUVOIR_REPRESENTANT', 'Pouvoir du Représentant', documents.pouvoirRepresentant);
      } else if (typeOrganisation === 'ENTREPRISE') {
        // Documents pour entreprises
        createDocument('RCCM', 'Document RCCM', documents.rccmDocument);
        createDocument('CARTE_CONTRIBUABLE', 'Carte de Contribuable', documents.carteContribuable);
        createDocument('CNI_REPRESENTANT', 'CNI du DG ou DRH', documents.cniRepresentant);
        createDocument('POUVOIR_DG', 'Pouvoir du DG', documents.pouvoirDg);
      }
      
      // Documents optionnels communs
      createDocument('LOGO_ETABLISSEMENT', 'Logo de l\'établissement', documents.logo);
      createDocument('PLAQUETTE', 'Plaquette institutionnelle', documents.plaquette);
      
      // Sauvegarder tous les documents
      if (documentsToSave.length > 0) {
        try {
          await prisma.documentEtablissement.createMany({
            data: documentsToSave
          });
          console.log(`✅ ${documentsToSave.length} documents Supabase sauvegardés en base`);
        } catch (error) {
          console.error('❌ Erreur lors de la sauvegarde des documents Supabase:', error);
          // Ne pas faire échouer l'inscription pour une erreur de documents
        }
      }
    }

    console.log('✅ Établissement créé avec succès via Supabase, ID:', etablissement.id_etablissement);

    // Suppression du mot de passe de la réponse
    const { motDePasseEtablissement: _, ...etablissementSansMotDePasse } = etablissement;

    res.status(201).json({
      success: true,
      message: 'Demande d\'inscription établissement soumise avec succès via Supabase ! Votre compte sera validé sous 48-72h.',
      data: etablissementSansMotDePasse
    });

  } catch (error) {
    console.error('❌ Erreur inscription établissement Supabase:', error);
    console.error('📋 Détails de l\'erreur:', error.message);
    console.error('🔍 Stack trace:', error.stack);
    
    // Vérifier si c'est une erreur Prisma
    if (error.code) {
      console.error('📊 Code erreur Prisma:', error.code);
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du compte établissement via Supabase',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ===============================================
//                GESTION PROFIL UTILISATEUR
// ===============================================

// Route pour récupérer le profil de l'utilisateur connecté
app.get('/api/user/profile', authenticateToken, async (req, res) => {
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
app.patch('/api/user/profile', authenticateToken, async (req, res) => {
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
app.patch('/api/user/password', authenticateToken, async (req, res) => {
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
app.get('/api/user/sessions', authenticateToken, async (req, res) => {
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
app.delete('/api/user/sessions/:sessionId', authenticateToken, async (req, res) => {
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
app.delete('/api/user/sessions', authenticateToken, async (req, res) => {
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

// Route pour nettoyer les sessions expirées (cron job)
app.post('/api/admin/cleanup-sessions', authenticateToken, requireRole('admin'), async (req, res) => {
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

// Route pour supprimer le compte
app.delete('/api/user/account', authenticateToken, async (req, res) => {
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

// Route pour changer le statut d'un établissement (pour l'admin)
app.patch('/api/admin/etablissement/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
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
app.get('/api/admin/document/:id/view', authenticateToken, requireRole('admin'), async (req, res) => {
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
app.get('/api/admin/document/:id/download', authenticateToken, requireRole('admin'), async (req, res) => {
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
app.patch('/api/admin/etablissement/:id/suspend', authenticateToken, requireRole('admin'), async (req, res) => {
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
app.get('/api/admin/apprenants', authenticateToken, requireRole('admin'), async (req, res) => {
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
app.patch('/api/admin/apprenant/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
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
app.delete('/api/admin/apprenant/:id', authenticateToken, requireRole('admin'), async (req, res) => {
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
app.post('/api/admin/apprenant', authenticateToken, requireRole('admin'), async (req, res) => {
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
app.post('/api/admin/etablissement', authenticateToken, requireRole('admin'), async (req, res) => {
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
app.delete('/api/admin/etablissement/:id', authenticateToken, requireRole('admin'), async (req, res) => {
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
// ROUTES POUR STATISTIQUES DE VÉRIFICATION
// ========================================

// Enregistrer une vérification de certificat
app.post('/api/certificats/:uuid/verify', async (req, res) => {
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
app.get('/api/certificats/:id/verification-stats', authenticateToken, async (req, res) => {
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

// Obtenir les statistiques d'un établissement
app.get('/api/etablissement/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Vérifier les permissions
    if (userRole === 'establishment' && parseInt(id) !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé' 
      });
    }

    // Calculer la date de début selon la période
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Statistiques générales
    const totalCertificates = await prisma.certificat.count({
      where: { 
        etablissementId: parseInt(id),
        createdAt: { gte: startDate }
      }
    });

    const totalStudents = await prisma.liaisonApprenantEtablissement.count({
      where: { 
        etablissementId: parseInt(id),
        statutLiaison: 'APPROUVE',
        dateApprobation: { gte: startDate }
      }
    });

    const totalVerifications = await prisma.verificationStat.count({
      where: {
        certificat: {
          etablissementId: parseInt(id)
        },
        verifiedAt: { gte: startDate }
      }
    });

    // Certificats par statut
    const certificatesByStatus = await prisma.certificat.groupBy({
      by: ['statut'],
      where: { 
        etablissementId: parseInt(id),
        createdAt: { gte: startDate }
      },
      _count: { statut: true }
    });

    const statusMap = {};
    certificatesByStatus.forEach(item => {
      statusMap[item.statut] = item._count.statut;
    });

    // Certificats par formation
    const certificatesByFormation = await prisma.certificat.groupBy({
      by: ['formationId'],
      where: { 
        etablissementId: parseInt(id),
        createdAt: { gte: startDate },
        formationId: { not: null }
      },
      _count: { formationId: true },
      _max: { createdAt: true }
    });

    const formationStats = await Promise.all(
      certificatesByFormation.map(async (item) => {
        const formation = await prisma.formation.findUnique({
          where: { id: item.formationId }
        });
        return {
          formationName: formation?.nomFormation || 'Formation inconnue',
          count: item._count.formationId
        };
      })
    );

    // Statistiques mensuelles (6 derniers mois)
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthCertificates = await prisma.certificat.count({
        where: {
          etablissementId: parseInt(id),
          createdAt: { gte: monthStart, lte: monthEnd }
        }
      });

      const monthVerifications = await prisma.verificationStat.count({
        where: {
          certificat: {
            etablissementId: parseInt(id)
          },
          verifiedAt: { gte: monthStart, lte: monthEnd }
        }
      });

      monthlyStats.push({
        month: monthStart.toLocaleDateString('fr-FR', { month: 'short' }),
        certificates: monthCertificates,
        verifications: monthVerifications
      });
    }

    // Top certificats les plus vérifiés
    const topVerifiedCertificates = await prisma.certificat.findMany({
      where: { 
        etablissementId: parseInt(id),
        createdAt: { gte: startDate }
      },
      include: {
        _count: {
          select: {
            verificationStats: true
          }
        }
      },
      orderBy: {
        verificationStats: {
          _count: 'desc'
        }
      },
      take: 5
    });

    const topVerified = topVerifiedCertificates.map(cert => ({
      id: cert.id,
      titre: cert.titre,
      verificationCount: cert._count.verificationStats
    }));

    res.json({ 
      success: true, 
      data: {
        totalCertificates,
        totalStudents,
        totalVerifications,
        certificatesByStatus: statusMap,
        certificatesByFormation: formationStats,
        monthlyStats,
        topVerifiedCertificates: topVerified
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération statistiques établissement:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message 
    });
  }
});

// ========================================
// ROUTES POUR NOTIFICATIONS
// ========================================

// Récupérer les notifications de l'utilisateur connecté
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;
    
    // Mapper le rôle vers le userType
    const userTypeMap = {
      'student': 'apprenant',
      'establishment': 'etablissement',
      'admin': 'admin'
    };
    const userType = userTypeMap[userRole];
    
    const where = {
      userId,
      userType,
      ...(unreadOnly === 'true' ? { lu: false } : {})
    };
    
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });
    
    const totalCount = await prisma.notification.count({ where });
    const unreadCount = await prisma.notification.count({ 
      where: { userId, userType, lu: false } 
    });
    
    res.json({ 
      success: true, 
      data: notifications,
      meta: {
        total: totalCount,
        unread: unreadCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des notifications',
      error: error.message 
    });
  }
});

// Marquer une notification comme lue
app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const userTypeMap = {
      'student': 'apprenant',
      'establishment': 'etablissement',
      'admin': 'admin'
    };
    const userType = userTypeMap[userRole];
    
    // Vérifier que la notification appartient à l'utilisateur
    const notification = await prisma.notification.findFirst({
      where: { 
        id: parseInt(id),
        userId,
        userType
      }
    });
    
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification introuvable' 
      });
    }
    
    // Marquer comme lue
    const updated = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { 
        lu: true,
        readAt: new Date()
      }
    });
    
    res.json({ 
      success: true, 
      data: updated 
    });
    
  } catch (error) {
    console.error('❌ Erreur marquage notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du marquage de la notification',
      error: error.message 
    });
  }
});

// Marquer toutes les notifications comme lues
app.patch('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const userTypeMap = {
      'student': 'apprenant',
      'establishment': 'etablissement',
      'admin': 'admin'
    };
    const userType = userTypeMap[userRole];
    
    const result = await prisma.notification.updateMany({
      where: { 
        userId,
        userType,
        lu: false
      },
      data: { 
        lu: true,
        readAt: new Date()
      }
    });
    
    res.json({ 
      success: true, 
      message: `${result.count} notifications marquées comme lues`,
      data: { count: result.count }
    });
    
  } catch (error) {
    console.error('❌ Erreur marquage notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du marquage des notifications',
      error: error.message 
    });
  }
});

// Supprimer une notification
app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const userTypeMap = {
      'student': 'apprenant',
      'establishment': 'etablissement',
      'admin': 'admin'
    };
    const userType = userTypeMap[userRole];
    
    // Vérifier que la notification appartient à l'utilisateur
    const notification = await prisma.notification.findFirst({
      where: { 
        id: parseInt(id),
        userId,
        userType
      }
    });
    
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: 'Notification introuvable' 
      });
    }
    
    await prisma.notification.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ 
      success: true, 
      message: 'Notification supprimée' 
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la suppression de la notification',
      error: error.message 
    });
  }
});

// Compter les notifications non lues
app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const userTypeMap = {
      'student': 'apprenant',
      'establishment': 'etablissement',
      'admin': 'admin'
    };
    const userType = userTypeMap[userRole];
    
    const count = await prisma.notification.count({
      where: { 
        userId,
        userType,
        lu: false
      }
    });
    
    res.json({ 
      success: true, 
      data: { count }
    });
    
  } catch (error) {
    console.error('❌ Erreur comptage notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du comptage des notifications',
      error: error.message 
    });
  }
});

// ========================================
// ROUTES POUR DASHBOARDS
// ========================================

// Récupérer les statistiques du dashboard pour un apprenant
app.get('/api/apprenant/:id/dashboard', authenticateToken, async (req, res) => {
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
app.get('/api/etablissement/:id/dashboard', authenticateToken, async (req, res) => {
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

// Fonction helper pour calculer le temps écoulé
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return `Il y a ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Il y a ${days}j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Il y a ${months} mois`;
  return `Il y a ${Math.floor(months / 12)} an${Math.floor(months / 12) > 1 ? 's' : ''}`;
}

// Fonction helper pour créer une notification
async function createNotification({ userId, userType, type, titre, message, important = false, lienAction = null, metadonnees = null }) {
  try {
    // Mapper userType vers les IDs appropriés
    const data = {
      userId,
      userType,
      type,
      titre,
      message,
      important,
      lienAction,
      metadonnees: metadonnees || null  // ✅ Prisma Json type accepte directement un objet
    };
    
    // Ajouter l'ID approprié selon le userType
    if (userType === 'apprenant') {
      data.apprenantId = userId;
    } else if (userType === 'etablissement') {
      data.etablissementId = userId;
    } else if (userType === 'admin') {
      data.adminId = userId;
    }
    
    const notification = await prisma.notification.create({ data });
    console.log(`📬 Notification créée pour ${userType} ${userId}: ${titre}`);
    return notification;
  } catch (error) {
    console.error('❌ Erreur création notification:', error);
    console.error('📋 Détails de la notification échouée:', { userId, userType, type, titre });
    // Ne pas faire échouer l'opération principale si la notification échoue
    return null;
  }
}

// ========================================
// ROUTES POUR FORMATIONS
// ========================================

// Récupérer les formations d'un établissement
app.get('/api/etablissement/:id/formations', authenticateToken, async (req, res) => {
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
app.post('/api/formations', authenticateToken, requireRole('establishment'), async (req, res) => {
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
app.put('/api/formations/:id', authenticateToken, requireRole('establishment'), async (req, res) => {
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
app.delete('/api/formations/:id', authenticateToken, requireRole('establishment'), async (req, res) => {
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

// ========================================
// ROUTES POUR CERTIFICATS
// ========================================

// Créer un brouillon de certificat
app.post('/api/certificats', authenticateToken, requireRole('establishment'), async (req, res) => {
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
app.post('/api/certificats/:id/pdf', authenticateToken, requireRole('establishment'), async (req, res) => {
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
    const { getVerifyUrl } = require('./config/environments');
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
app.post('/api/certificats/:id/emit', authenticateToken, requireRole('establishment'), async (req, res) => {
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

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Charger la clé chiffrée de l'établissement
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

    let signer;
    try {
      const pk = decryptPrivateKey({ iv: vault.iv, authTag: vault.authTag, cipherText: vault.cipherText });
      signer = new ethers.Wallet(pk, provider);
    } catch (e) {
      console.error('❌ Erreur déchiffrement clé établissement:', e);
      await prisma.certificat.update({
        where: { id: parseInt(id) },
        data: { statut: 'EMISSION_ECHEC' }
      });
      return res.status(500).json({ success: false, message: 'Erreur déchiffrement clé établissement' });
    }

    // ABI minimal
    const abi = [
      'function issue(bytes32 pdfHash, address student) external',
      'function isIssued(bytes32 pdfHash) external view returns (bool)',
      'event CertificateIssued(bytes32 indexed pdfHash, address indexed student, address indexed issuer, uint64 issuedAt)'
    ];
    const contract = new ethers.Contract(contractAddress, abi, signer);

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
      const already = await contract.isIssued(hashHexRaw);
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

    // Émission on-chain avec timeout
    let txHash = null;
    let onChainSuccess = false;
    
    try {
      console.log(`🚀 Émission on-chain du certificat ${id}...`);
      
      const tx = await Promise.race([
        contract.issue(hashHexRaw, recipient),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de la transaction')), 30000)
        )
      ]);
      
      const receipt = await tx.wait();
      txHash = receipt?.hash || tx.hash;
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
app.get('/api/certificats/:id/verify-onchain', authenticateToken, async (req, res) => {
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

    const provider = new ethers.JsonRpcProvider(rpcUrl);
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
app.post('/api/certificats/:id/retry-emit', authenticateToken, requireRole('establishment'), async (req, res) => {
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

    const provider = new ethers.JsonRpcProvider(rpcUrl);
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

    let signer;
    try {
      const pk = decryptPrivateKey({ iv: vault.iv, authTag: vault.authTag, cipherText: vault.cipherText });
      signer = new ethers.Wallet(pk, provider);
    } catch (e) {
      await prisma.certificat.update({
        where: { id: parseInt(id) },
        data: { statut: 'EMISSION_ECHEC' }
      });
      return res.status(500).json({ success: false, message: 'Erreur déchiffrement clé établissement' });
    }

    const abi = [
      'function issue(bytes32 pdfHash, address student) external',
      'function isIssued(bytes32 pdfHash) external view returns (bool)'
    ];
    const contract = new ethers.Contract(contractAddress, abi, signer);

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
      const already = await contract.isIssued(hashHexRaw);
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

    // Re-émission on-chain avec timeout
    let txHash = null;
    let onChainSuccess = false;
    
    try {
      console.log(`🔄 Re-émission on-chain du certificat ${id}...`);
      
      const tx = await Promise.race([
        contract.issue(hashHexRaw, recipient),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de la transaction')), 30000)
        )
      ]);
      
      const receipt = await tx.wait();
      txHash = receipt?.hash || tx.hash;
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
app.post('/api/certificats/:id/revoke', authenticateToken, async (req, res) => {
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
        const rpcUrl = process.env.CHAIN_RPC_URL;
        const contractAddress = process.env.CERT_CONTRACT_ADDRESS;
        if (!rpcUrl || !contractAddress) {
          throw new Error('Config blockchain manquante');
        }
        
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Récupérer la clé privée de l'établissement
        const walletVault = await prisma.walletVault.findFirst({
          where: { 
            ownerType: 'etablissement',
            ownerId: certificat.etablissementId
          }
        });

        if (walletVault) {
          const privateKey = decryptPrivateKey(walletVault);
          const wallet = new ethers.Wallet(privateKey, provider);
          
          // Connexion au contrat
          const contract = new ethers.Contract(
            certificat.contractAddress,
            ['function revoke(bytes32 pdfHash, string calldata reason) external'],
            wallet
          );

          // Convertir le hash PDF en bytes32 (ajouter 0x si nécessaire et vérifier la longueur)
          const hashHexRaw = certificat.pdfHash.startsWith('0x') ? certificat.pdfHash : '0x' + certificat.pdfHash;
          console.log(`🔍 Hash PDF original: ${certificat.pdfHash}`);
          console.log(`🔍 Hash PDF formaté: ${hashHexRaw} (longueur: ${hashHexRaw.length})`);
          
          if (hashHexRaw.length !== 66) {
            throw new Error(`Hash PDF invalide: ${hashHexRaw} (longueur: ${hashHexRaw.length})`);
          }

          // Appel de la fonction revoke avec timeout
          const tx = await Promise.race([
            contract.revoke(
              hashHexRaw,
              reason || 'Certificat révoqué par l\'établissement'
            ),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout de la transaction')), 30000)
            )
          ]);
          
          await tx.wait();
          txHash = tx.hash;
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
app.post('/api/certificats/:id/retry-revoke', authenticateToken, async (req, res) => {
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
        const rpcUrl = process.env.CHAIN_RPC_URL;
        const contractAddress = process.env.CERT_CONTRACT_ADDRESS;
        if (!rpcUrl || !contractAddress) {
          throw new Error('Config blockchain manquante');
        }
        
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        const walletVault = await prisma.walletVault.findFirst({
          where: { 
            ownerType: 'etablissement',
            ownerId: certificat.etablissementId
          }
        });

        if (walletVault) {
          const privateKey = decryptPrivateKey(walletVault);
          const wallet = new ethers.Wallet(privateKey, provider);
          
          const contract = new ethers.Contract(
            certificat.contractAddress,
            ['function revoke(bytes32 pdfHash, string calldata reason) external'],
            wallet
          );

          // Convertir le hash PDF en bytes32 (ajouter 0x si nécessaire et vérifier la longueur)
          const hashHexRaw = certificat.pdfHash.startsWith('0x') ? certificat.pdfHash : '0x' + certificat.pdfHash;
          console.log(`🔍 Hash PDF original: ${certificat.pdfHash}`);
          console.log(`🔍 Hash PDF formaté: ${hashHexRaw} (longueur: ${hashHexRaw.length})`);
          
          if (hashHexRaw.length !== 66) {
            throw new Error(`Hash PDF invalide: ${hashHexRaw} (longueur: ${hashHexRaw.length})`);
          }

          const tx = await Promise.race([
            contract.revoke(
              hashHexRaw,
              reason || certificat.revocationReason || 'Certificat révoqué par l\'établissement'
            ),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout de la transaction')), 30000)
            )
          ]);
          
          await tx.wait();
          txHash = tx.hash;
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
app.get('/api/certificats', authenticateToken, async (req, res) => {
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
app.get('/api/certificats/public/:uuid', async (req, res) => {
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
app.get('/api/certificats/public/:uuid/verify', async (req, res) => {
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

    const provider = new ethers.JsonRpcProvider(rpcUrl);
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

// Obtenir l'adresse du wallet établissement avec solde (pour funding)
app.get('/api/etablissement/me/wallet', authenticateToken, requireRole('establishment'), async (req, res) => {
  try {
    const etablissementId = req.user.id;
    const vault = await prisma.walletVault.findFirst({ where: { ownerType: 'etablissement', ownerId: etablissementId } });
    if (!vault) return res.status(404).json({ success: false, message: 'Vault introuvable' });
    
    // Dériver l'adresse depuis la clé privée
    let address;
    try {
      const pk = decryptPrivateKey({ iv: vault.iv, authTag: vault.authTag, cipherText: vault.cipherText });
      const wallet = new ethers.Wallet(pk);
      address = wallet.address;
      console.log('🔑 Clé privée déchiffrée avec succès');
      console.log('📍 Adresse dérivée:', address);
    } catch (err) {
      console.error('❌ Erreur déchiffrement clé privée:', err);
      return res.status(500).json({ success: false, message: 'Erreur lecture wallet' });
    }

    // Récupérer le solde MATIC
    let balance = '0';
    let balanceError = null;
    try {
      const rpcUrl = process.env.AMOY_RPC_URL || 'https://polygon-amoy.g.alchemy.com/v2/41EXpeJsOFHfwzaQHCvmJ';
      console.log('🔗 RPC URL utilisée:', rpcUrl);
      console.log('📍 Adresse wallet:', address);
      
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const balanceWei = await provider.getBalance(address);
      balance = ethers.formatEther(balanceWei);
      console.log('💰 Solde récupéré:', balance, 'MATIC');
    } catch (err) {
      console.warn('⚠️ Erreur récupération solde:', err.message);
      balanceError = err.message;
    }

    return res.json({ 
      success: true, 
      data: { 
        address,
        balance: parseFloat(balance).toFixed(4), // 4 décimales
        balanceError,
        network: 'Polygon Amoy Testnet',
        explorerUrl: `https://amoy.polygonscan.com/address/${address}`,
        faucetUrl: 'https://faucet.polygon.technology/',
        currency: 'MATIC'
      } 
    });
  } catch (error) {
    console.error('❌ Erreur wallet établissement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});

// ========================================
// ROUTES POUR LA GESTION DES LIAISONS APPRENANT-ÉTABLISSEMENT
// ========================================

// Route pour créer une demande de liaison (apprenant vers établissement)
app.post('/api/liaison/demande', authenticateToken, async (req, res) => {
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

// Route pour récupérer les demandes de liaison d'un établissement
app.get('/api/etablissement/:id/demandes', authenticateToken, requireRole('establishment'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`🔍 Récupération des demandes pour l'établissement ${id}`);

    // Vérifier que l'établissement appartient à l'utilisateur connecté
    if (parseInt(id) !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cet établissement'
      });
    }

    const demandes = await prisma.liaisonApprenantEtablissement.findMany({
      where: {
        etablissementId: parseInt(id),
        statutLiaison: 'EN_ATTENTE'
      },
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
        }
      },
      orderBy: { dateDemande: 'desc' }
    });

    console.log(`✅ ${demandes.length} demandes trouvées`);

    res.json({
      success: true,
      data: demandes
    });

  } catch (error) {
    console.error('❌ Erreur récupération demandes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des demandes',
      error: error.message
    });
  }
});

// Route pour approuver/rejeter une demande de liaison
app.patch('/api/liaison/:id/statut', authenticateToken, requireRole('establishment'), async (req, res) => {
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

// Route pour récupérer les liaisons d'un apprenant
app.get('/api/apprenant/liaisons', authenticateToken, async (req, res) => {
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

// Route pour récupérer les étudiants liés d'un établissement
app.get('/api/etablissement/:id/etudiants', authenticateToken, requireRole('establishment'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`🔍 Récupération des étudiants liés pour l'établissement ${id}`);
    console.log(`👤 Utilisateur connecté:`, {
      id: userId,
      role: req.user.role,
      type: req.user.type,
      nom: req.user.nom
    });

    // Vérifier que l'établissement appartient à l'utilisateur connecté
    if (parseInt(id) !== userId) {
      console.log(`❌ Accès refusé: ID établissement (${id}) !== ID utilisateur (${userId})`);
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cet établissement'
      });
    }

    const etudiants = await prisma.liaisonApprenantEtablissement.findMany({
      where: {
        etablissementId: parseInt(id),
        statutLiaison: 'APPROUVE'
      },
      include: {
        apprenant: {
          select: {
            id_apprenant: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true,
            dateCreation: true,
            statut: true
          }
        }
      },
      orderBy: { dateApprobation: 'desc' }
    });

    console.log(`✅ ${etudiants.length} étudiants liés trouvés`);

    res.json({
      success: true,
      data: etudiants
    });

  } catch (error) {
    console.error('❌ Erreur récupération étudiants liés:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des étudiants',
      error: error.message
    });
  }
});

// Route pour récupérer les statistiques de liaison d'un établissement
app.get('/api/etablissement/:id/stats-liaisons', authenticateToken, requireRole('establishment'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(`📊 Récupération des statistiques pour l'établissement ${id}`);

    // Vérifier que l'établissement appartient à l'utilisateur connecté
    if (parseInt(id) !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cet établissement'
      });
    }

    const [
      totalDemandes,
      demandesEnAttente,
      etudiantsApprouves,
      demandesRejetees
    ] = await Promise.all([
      prisma.liaisonApprenantEtablissement.count({
        where: { etablissementId: parseInt(id) }
      }),
      prisma.liaisonApprenantEtablissement.count({
        where: { 
          etablissementId: parseInt(id),
          statutLiaison: 'EN_ATTENTE'
        }
      }),
      prisma.liaisonApprenantEtablissement.count({
        where: { 
          etablissementId: parseInt(id),
          statutLiaison: 'APPROUVE'
        }
      }),
      prisma.liaisonApprenantEtablissement.count({
        where: { 
          etablissementId: parseInt(id),
          statutLiaison: 'REJETE'
        }
      })
    ]);

    const stats = {
      totalDemandes,
      demandesEnAttente,
      etudiantsApprouves,
      demandesRejetees,
      tauxApprobation: totalDemandes > 0 ? Math.round((etudiantsApprouves / totalDemandes) * 100) : 0
    };

    console.log(`✅ Statistiques récupérées:`, stats);

    res.json({
      success: true,
      data: stats
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

// Route de santé pour Railway
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ===============================================
//                UPLOAD FICHIERS SUPABASE
// ===============================================

// Route pour upload direct vers Supabase
app.post('/api/upload/supabase', authenticateToken, upload.single('file'), async (req, res) => {
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

// ===============================================
//                DEMANDES DE CERTIFICAT
// ===============================================

// Route pour créer une demande de certificat (Apprenant uniquement)
app.post('/api/demandes-certificat', authenticateToken, requireRole('student'), upload.array('documents', 5), async (req, res) => {
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
app.get('/api/apprenant/:id/demandes-certificat', authenticateToken, async (req, res) => {
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
app.get('/api/etablissement/:id/demandes-certificat', authenticateToken, async (req, res) => {
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
app.patch('/api/demandes-certificat/:id/statut', authenticateToken, async (req, res) => {
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
app.get('/api/documents/:id/url', authenticateToken, async (req, res) => {
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
    const { getAppropriateUrl } = require('./utils/supabaseUrlGenerator');
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
app.get('/api/demandes-certificat/:id', authenticateToken, async (req, res) => {
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

// Initialiser Supabase Storage au démarrage
async function initializeSupabase() {
  try {
    const result = await supabaseStorage.ensureBucketExists();
    
    if (result.success) {
      console.log('✅ Supabase Storage initialisé');
    } else {
      console.error('❌ Erreur initialisation Supabase:', result.error);
    }
  } catch (error) {
    console.error('❌ Erreur initialisation Supabase:', error);
  }
}

// Nettoyage automatique des sessions expirées au démarrage
async function initializeServer() {
  try {
    console.log('🧹 Nettoyage des sessions expirées...');
    const cleanedCount = await cleanupExpiredSessions();
    console.log(`✅ ${cleanedCount} sessions expirées supprimées`);
  } catch (error) {
    console.error('❌ Erreur nettoyage sessions au démarrage:', error);
  }
}

// Démarrage du serveur (seulement si appelé directement)
if (require.main === module) {
  // Initialiser Supabase avant de démarrer le serveur
  initializeSupabase().then(async () => {
    app.listen(PORT, async () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📡 API disponible sur http://localhost:${PORT}/api`);
      console.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL || 'Non défini'}`);
      console.log(`☁️ Supabase Storage: ${process.env.SUPABASE_URL ? 'Configuré' : 'Non configuré'}`);
      
      // Nettoyer les sessions expirées au démarrage
      await initializeServer();
      
      // Nettoyer les sessions expirées toutes les heures
      setInterval(async () => {
        try {
          const cleanedCount = await cleanupExpiredSessions();
          if (cleanedCount > 0) {
            console.log(`🧹 Nettoyage automatique: ${cleanedCount} sessions expirées supprimées`);
          }
        } catch (error) {
          console.error('❌ Erreur nettoyage automatique:', error);
        }
      }, 60 * 60 * 1000); // Toutes les heures
    });
  });

  // Gestion de la fermeture
  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

// Export de l'app pour le fichier start.js
module.exports = app;
