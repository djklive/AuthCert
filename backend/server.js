require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { createEtablissementUpload, cleanupFiles, getFileInfo } = require('./utils/uploadHandler');
const { 
  generateToken, 
  authenticateToken, 
  requireRole, 
  requireStatus 
} = require('./config/jwt');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { ethers } = require('ethers');

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;

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
        typeDocument: 'logo',
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
          Subject: 'Certificat de formation',
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
            const logoBuffer = await logoResponse.buffer();
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
         .text('CERTIFICAT DE FORMATION', margin, titleY, { 
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
           id: 'admin',
           email: email,
           role: 'admin',
           nom: 'Administrateur'
         };
         
         const token = generateToken(userData);
         
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

// Route d'inscription d'un établissement AVEC Supabase Storage
app.post('/api/register/etablissement/supabase', async (req, res) => {
  try {
    console.log('🚀 Début inscription établissement avec Supabase Storage');
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
      documents // URLs des fichiers Supabase
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
        rccmEtablissement,
        typeEtablissement: typeEtablissementBackend,
        adresseEtablissement,
        telephoneEtablissement,
        nomResponsableEtablissement,
        emailResponsableEtablissement,
        telephoneResponsableEtablissement,
        statut: 'EN_ATTENTE',
        dateCreation: new Date(),
        dateModification: new Date(),
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
      console.log('🔗 RCCM:', documents.rccmDocument);
      console.log('🔗 Autorisation:', documents.autorisation);
      console.log('🔗 Pièce d\'identité:', documents.pieceIdentite);
      console.log('🔗 Logo:', documents.logo);
      console.log('🔗 Plaquette:', documents.plaquette);
    }

    // Sauvegarder les URLs des documents Supabase dans la base
    if (documents) {
      const documentsToSave = [];
      
      // Documents obligatoires
      if (documents.rccmDocument) {
        documentsToSave.push({
          etablissementId: etablissement.id_etablissement,
          typeDocument: 'rccm',
          nomFichier: 'Document RCCM',
          typeMime: 'application/pdf',
          tailleFichier: 0, // Taille non disponible depuis Supabase
          cheminFichier: documents.rccmDocument, // URL Supabase
          statut: 'EN_ATTENTE',
          dateUpload: new Date()
        });
      }
      
      if (documents.autorisation) {
        documentsToSave.push({
          etablissementId: etablissement.id_etablissement,
          typeDocument: 'autorisation',
          nomFichier: 'Autorisation de fonctionnement',
          typeMime: 'application/pdf',
          tailleFichier: 0,
          cheminFichier: documents.autorisation, // URL Supabase
          statut: 'EN_ATTENTE',
          dateUpload: new Date()
        });
      }
      
      if (documents.pieceIdentite) {
        documentsToSave.push({
          etablissementId: etablissement.id_etablissement,
          typeDocument: 'pieceIdentite',
          nomFichier: 'Pièce d\'identité du représentant',
          typeMime: 'application/pdf',
          tailleFichier: 0,
          cheminFichier: documents.pieceIdentite, // URL Supabase
          statut: 'EN_ATTENTE',
          dateUpload: new Date()
        });
      }
      
      // Documents optionnels
      if (documents.logo) {
        documentsToSave.push({
          etablissementId: etablissement.id_etablissement,
          typeDocument: 'logo',
          nomFichier: 'Logo de l\'établissement',
          typeMime: 'image/png',
          tailleFichier: 0,
          cheminFichier: documents.logo, // URL Supabase
          statut: 'EN_ATTENTE',
          dateUpload: new Date()
        });
      }
      
      if (documents.plaquette) {
        documentsToSave.push({
          etablissementId: etablissement.id_etablissement,
          typeDocument: 'plaquette',
          nomFichier: 'Plaquette institutionnelle',
          typeMime: 'application/pdf',
          tailleFichier: 0,
          cheminFichier: documents.plaquette, // URL Supabase
          statut: 'EN_ATTENTE',
          dateUpload: new Date()
        });
      }
      
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

// ========================================
// ROUTES POUR CERTIFICATS
// ========================================

// Créer un brouillon de certificat
app.post('/api/certificats', authenticateToken, requireRole('establishment'), async (req, res) => {
  try {
    const { apprenantId, titre, mention, dateObtention } = req.body;
    const etablissementId = req.user.id;

    if (!apprenantId || !titre || !dateObtention) {
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    }

    // Vérifier que l'apprenant est lié (approuvé) à l'établissement
    const liaison = await prisma.liaisonApprenantEtablissement.findFirst({
      where: { apprenantId: parseInt(apprenantId), etablissementId, statutLiaison: 'APPROUVE' }
    });
    if (!liaison) {
      return res.status(403).json({ success: false, message: 'Apprenant non lié à votre établissement' });
    }

    const uuid = uuidv4();
    const certificat = await prisma.certificat.create({
      data: {
        uuid,
        etablissementId,
        apprenantId: parseInt(apprenantId),
        titre,
        mention: mention || null,
        dateObtention: new Date(dateObtention),
        statut: 'BROUILLON'
      }
    });

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
        etablissement: true
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

// Émettre un certificat on-chain (MVP sur un contrat central unique)
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

    const rpcUrl = process.env.CHAIN_RPC_URL;
    const contractAddress = process.env.CERT_CONTRACT_ADDRESS;
    if (!rpcUrl || !contractAddress) {
      return res.status(500).json({ success: false, message: 'Config blockchain manquante' });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    // Charger la clé chiffrée de l'établissement
    const vault = await prisma.walletVault.findFirst({ where: { ownerType: 'etablissement', ownerId: etablissementId } });
    if (!vault) {
      return res.status(500).json({ success: false, message: 'Clé établissement manquante (vault)' });
    }
    let signer;
    try {
      const pk = decryptPrivateKey({ iv: vault.iv, authTag: vault.authTag, cipherText: vault.cipherText });
      signer = new ethers.Wallet(pk, provider);
    } catch (e) {
      console.error('❌ Erreur déchiffrement clé établissement:', e);
      return res.status(500).json({ success: false, message: 'Erreur déchiffrement clé établissement' });
    }

    // New minimal ABI
    const abi = [
      'function issue(bytes32 pdfHash, address student) external',
      'function isIssued(bytes32 pdfHash) external view returns (bool)',
      'event CertificateIssued(bytes32 indexed pdfHash, address indexed student, address indexed issuer, uint64 issuedAt)'
    ];
    const contract = new ethers.Contract(contractAddress, abi, signer);

    // recipient: student's wallet if exists
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
    } catch {}

    // Convert stored hex hash string to bytes32
    const hashHexRaw = certificat.pdfHash.startsWith('0x') ? certificat.pdfHash : '0x' + certificat.pdfHash;
    // Ensure 32 bytes (sha256 hex is 64 chars + 0x)
    if (hashHexRaw.length !== 66) {
      return res.status(400).json({ success: false, message: 'Hash PDF invalide' });
    }
    const hashBytes32 = hashHexRaw;

    // Idempotence: ne pas ré émettre si déjà présent on-chain
    try {
      const already = await contract.isIssued(hashBytes32);
      if (already) {
        const updated = await prisma.certificat.update({
          where: { id: certificat.id },
          data: { statut: 'EMIS', contractAddress }
        });
        return res.json({ success: true, data: updated, message: 'Certificat déjà émis on-chain' });
      }
    } catch {}

    const tx = await contract.issue(hashBytes32, recipient);
    const receipt = await tx.wait();

    const updated = await prisma.certificat.update({
      where: { id: certificat.id },
      data: {
        statut: 'EMIS',
        txHash: receipt?.hash || tx.hash,
        contractAddress: contractAddress,
        issuedAt: new Date()
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('❌ Erreur émission on-chain:', error);
    console.error('❌ Erreur émission on-chain:', error.message);
    res.status(500).json({ success: false, message: 'Erreur émission on-chain', error: error.message });
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

    // TODO: Implémenter la révocation on-chain si nécessaire
    // Pour l'instant, on met juste à jour le statut en base

    await prisma.certificat.update({
      where: { id: parseInt(id) },
      data: { 
        statut: 'REVOQUE',
        // Ajouter un champ pour la raison si nécessaire
      }
    });

    console.log(`✅ Certificat ${id} révoqué par ${req.user.role} ${req.user.id}`);

    res.json({
      success: true,
      message: 'Certificat révoqué avec succès',
      data: {
        certificatId: parseInt(id),
        statut: 'REVOQUE',
        revokedAt: new Date().toISOString(),
        revokedBy: req.user.role,
        reason: reason || null
      }
    });

  } catch (error) {
    console.error('❌ Erreur révocation certificat:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la révocation', error: error.message });
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
      orderBy: { createdAt: 'desc' }
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

// Export de l'app pour le fichier start.js
module.exports = app;

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

// Démarrage du serveur (seulement si appelé directement)
if (require.main === module) {
  // Initialiser Supabase avant de démarrer le serveur
  initializeSupabase().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📡 API disponible sur http://localhost:${PORT}/api`);
      console.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL || 'Non défini'}`);
      console.log(`☁️ Supabase Storage: ${process.env.SUPABASE_URL ? 'Configuré' : 'Non configuré'}`);
    });
  });

  // Gestion de la fermeture
  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
