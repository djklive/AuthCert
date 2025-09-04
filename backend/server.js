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

    // Création de l'apprenant
    const apprenant = await prisma.apprenant.create({
      data: {
        email,
        motDePasse: hashedPassword,
        nom,
        prenom,
        telephone: telephone || null,
        statut: 'ACTIF',
        dateCreation: new Date(),
        dateModification: new Date()
      }
    });

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
        dateModification: new Date()
      }
    });

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
    
    // Construire le chemin complet du fichier
    const filePath = path.join(__dirname, document.cheminFichier);
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier physique non trouvé'
      });
    }
    
    // Envoyer le fichier pour visualisation (pas de téléchargement)
    res.sendFile(filePath);
    
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
    
    // Construire le chemin complet du fichier
    const filePath = path.join(__dirname, document.cheminFichier);
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier physique non trouvé'
      });
    }
    
    // Définir le nom du fichier pour le téléchargement
    const fileName = document.nomFichier;
    
    // Définir les headers pour le téléchargement
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', document.typeMime || 'application/octet-stream');
    
    // Envoyer le fichier
    res.sendFile(filePath);
    
    console.log(`📥 Document téléchargé: ${fileName} (${document.cheminFichier})`);
    
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

    // Vérifier que l'établissement appartient à l'utilisateur connecté
    if (parseInt(id) !== userId) {
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

// Démarrage du serveur (seulement si appelé directement)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📡 API disponible sur http://localhost:${PORT}/api`);
    console.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL || 'Non défini'}`);
  });

  // Gestion de la fermeture
  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
