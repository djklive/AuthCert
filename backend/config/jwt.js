const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Générer un token JWT
const generateToken = (userData) => {
  return jwt.sign(userData, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN 
  });
};

// Vérifier un token JWT
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw error;
  }
};

// Middleware pour vérifier l'authentification
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token d\'authentification requis' 
      });
    }
    
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expiré, veuillez vous reconnecter' 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Token invalide' 
    });
  }
};

// Middleware pour vérifier le rôle
const requireRole = (role) => {
  return (req, res, next) => {
    console.log(`🔐 Vérification du rôle:`, {
      requiredRole: role,
      userRole: req.user?.role,
      userType: req.user?.type,
      userId: req.user?.id,
      userData: req.user
    });
    
    if (!req.user) {
      console.log(`❌ Utilisateur non authentifié`);
      return res.status(401).json({ 
        success: false, 
        message: 'Utilisateur non authentifié' 
      });
    }
    
    if (req.user.role !== role) {
      console.log(`❌ Rôle incorrect: attendu '${role}', reçu '${req.user.role}'`);
      return res.status(403).json({ 
        success: false, 
        message: `Rôle ${role} requis pour cette action` 
      });
    }
    
    console.log(`✅ Rôle correct: ${role}`);
    next();
  };
};

// Middleware pour vérifier le statut (pour les établissements)
const requireStatus = (status) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Utilisateur non authentifié' 
      });
    }
    
    if (req.user.role === 'establishment' && req.user.statut !== status) {
      return res.status(403).json({ 
        success: false, 
        message: `Statut ${status} requis pour cette action` 
      });
    }
    next();
  };
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  requireRole,
  requireStatus,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
