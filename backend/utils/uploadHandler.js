const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration spéciale pour l'upload d'établissement
const createEtablissementUpload = (etablissementId) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Utiliser l'ID de l'établissement directement
      const uploadPath = path.join(__dirname, '../uploads/etablissements', etablissementId.toString());
      
      // Créer le dossier s'il n'existe pas
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log(`📁 Dossier créé: ${uploadPath}`);
      }
      
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const originalName = file.originalname;
      const extension = path.extname(originalName);
      const baseName = path.basename(originalName, extension);
      
      // Utiliser le nom du champ comme type de document
      const typeDocument = file.fieldname; // 'rccmDocument', 'autorisation', etc.
      
      // Format: typeDocument_timestamp_originalName.extension
      const filename = `${typeDocument}_${timestamp}_${baseName}${extension}`;
      
      cb(null, filename);
    }
  });

  const fileFilter = (req, file, cb) => {
    // Types de fichiers autorisés selon le type de document
    const allowedTypes = {
      rccmDocument: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
      autorisation: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
      pieceIdentite: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
      logo: ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'],
      plaquette: ['application/pdf']
    };
    
    const fieldName = file.fieldname;
    const fileType = file.mimetype;
    
    if (allowedTypes[fieldName] && allowedTypes[fieldName].includes(fileType)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non supporté pour ${fieldName}: ${fileType}`), false);
    }
  };

  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
      files: 5 // 5 fichiers max
    }
  });
};

// Fonction pour nettoyer les fichiers temporaires en cas d'erreur
const cleanupFiles = (files) => {
  if (!files) return;
  
  Object.values(files).forEach(fileArray => {
    if (Array.isArray(fileArray)) {
      fileArray.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log(`🗑️ Fichier supprimé: ${file.path}`);
        }
      });
    }
  });
};

// Fonction pour obtenir les informations des fichiers uploadés
const getFileInfo = (files) => {
  const fileInfo = {};
  
  Object.keys(files).forEach(fieldName => {
    const fileArray = files[fieldName];
    if (Array.isArray(fileArray) && fileArray.length > 0) {
      const file = fileArray[0]; // Prendre le premier fichier
      fileInfo[fieldName] = {
        nom: file.originalname,
        type: file.mimetype,
        taille: file.size,
        chemin: file.path,
        nomFichier: file.filename
      };
    }
  });
  
  return fileInfo;
};

module.exports = {
  createEtablissementUpload,
  cleanupFiles,
  getFileInfo
};
