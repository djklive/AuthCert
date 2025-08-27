const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Créer le dossier pour l'établissement s'il n'existe pas
    const etablissementId = req.body.etablissementId || 'temp';
    const uploadPath = path.join(__dirname, '../uploads/etablissements', etablissementId.toString());
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    
    // Format: typeDocument_timestamp_originalName.extension
    const typeDocument = req.body.typeDocument || 'document';
    const filename = `${typeDocument}_${timestamp}_${baseName}${extension}`;
    
    cb(null, filename);
  }
});

// Filtre des fichiers
const fileFilter = (req, file, cb) => {
  // Types de fichiers autorisés
  const allowedTypes = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/svg+xml': ['.svg']
  };
  
  const fileType = file.mimetype;
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes[fileType] && allowedTypes[fileType].includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non supporté: ${fileType} (${fileExtension})`), false);
  }
};

// Configuration de Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 5 // 5 fichiers max par requête
  }
});

// Middleware pour gérer les erreurs Multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Fichier trop volumineux. Taille maximum : 5MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Trop de fichiers. Maximum : 5 fichiers'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Erreur upload: ${error.message}`
    });
  }
  
  if (error.message.includes('Type de fichier non supporté')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

module.exports = {
  upload,
  handleMulterError
};
