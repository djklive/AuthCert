const multer = require('multer');

// Upload en mémoire : les fichiers sont ensuite poussés vers Supabase Storage.
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

module.exports = { upload };
