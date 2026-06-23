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
const { mapTypeEtablissement, getTimeAgo, createNotification, notifyAllAdmins } = require('../utils/helpers');
const { encryptPrivateKey, decryptPrivateKey, sha256Hex } = require('../utils/cryptoUtils');

const router = express.Router();

// Route d'inscription d'un établissement
router.post('/api/register/etablissement', async (req, res) => {
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

    // Notifier les administrateurs de la nouvelle demande à valider
    try {
      await notifyAllAdmins({
        type: 'ETABLISSEMENT_INSCRIPTION',
        titre: 'Nouvelle inscription établissement',
        message: `${etablissement.nomEtablissement} a soumis une demande d'inscription à valider.`,
        important: true,
        lienAction: '/dashboard?userType=admin',
        metadonnees: { etablissementId: etablissement.id_etablissement }
      });
    } catch (notifError) {
      console.error('⚠️ Erreur notification admins (inscription):', notifError);
    }

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

// Route pour recuperer tous les etablissements (page d'accueil)
router.get('/api/accueil/etablissements', async (req, res) => {
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
router.get('/api/etablissement/:id/documents', async (req, res) => {
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

// Route d'inscription d'un établissement AVEC Supabase Storage - Système Adaptatif
router.post('/api/register/etablissement/supabase', async (req, res) => {
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

    // Notifier les administrateurs de la nouvelle demande à valider
    try {
      await notifyAllAdmins({
        type: 'ETABLISSEMENT_INSCRIPTION',
        titre: 'Nouvelle inscription établissement',
        message: `${etablissement.nomEtablissement} a soumis une demande d'inscription à valider.`,
        important: true,
        lienAction: '/dashboard?userType=admin',
        metadonnees: { etablissementId: etablissement.id_etablissement }
      });
    } catch (notifError) {
      console.error('⚠️ Erreur notification admins (inscription Supabase):', notifError);
    }

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

// Obtenir les statistiques d'un établissement
router.get('/api/etablissement/:id/stats', authenticateToken, async (req, res) => {
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

// Note (modèle relayer) : la route GET /api/etablissement/me/wallet a été
// supprimée. Les établissements n'ont plus de wallet à financer : les frais
// blockchain (gas) sont pris en charge par le wallet relayer de la plateforme.
// Le solde du relayer est consultable côté admin via GET /api/admin/relayer-wallet.

// Route pour récupérer les demandes de liaison d'un établissement
router.get('/api/etablissement/:id/demandes', authenticateToken, requireRole('establishment'), async (req, res) => {
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

// Route pour récupérer les étudiants liés d'un établissement
router.get('/api/etablissement/:id/etudiants', authenticateToken, requireRole('establishment'), async (req, res) => {
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
router.get('/api/etablissement/:id/stats-liaisons', authenticateToken, requireRole('establishment'), async (req, res) => {
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
module.exports = router;
