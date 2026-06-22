const jwt = require('jsonwebtoken');
const prisma = require('./prisma');

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

// Middleware pour vérifier l'authentification avec gestion des sessions
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token d\'authentification requis' 
      });
    }
    
    // Vérifier le JWT
    const decoded = verifyToken(token);
    
    // Vérifier que la session existe et est active
    const session = await prisma.session.findFirst({
      where: {
        token: token,
        userId: decoded.id,
        userType: decoded.role,
        expiresAt: {
          gt: new Date() // Session non expirée
        }
      }
    });

    if (!session) {
      console.log(`❌ Session invalide ou expirée pour l'utilisateur ${decoded.id}`);
      return res.status(403).json({ 
        success: false, 
        message: 'Session invalide ou expirée' 
      });
    }

    // Mettre à jour la dernière activité de la session
    await prisma.session.update({
      where: { id: session.id },
      data: { 
        createdAt: new Date() // Mise à jour de l'activité
      }
    });

    req.user = decoded;
    req.session = session;
    next();
  } catch (error) {
    console.error('❌ Erreur authentification:', error);
    
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

// ===============================================
//                GESTION DES SESSIONS
// ===============================================

// Créer une nouvelle session
const createSession = async (userId, userType, token, req = null) => {
  try {
    // Calculer la date d'expiration (24h par défaut)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Extraire les métadonnées de la requête
    const ipAddress = req?.ip || req?.connection?.remoteAddress || 'Unknown';
    const userAgent = req?.get('User-Agent') || 'Unknown';
    
    // Détecter le type d'appareil basé sur le User-Agent
    let deviceType = 'desktop';
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      deviceType = 'mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      deviceType = 'tablet';
    }
    
    // Générer un nom d'appareil basé sur le User-Agent
    let deviceName = 'Appareil inconnu';
    if (userAgent.includes('Chrome')) {
      deviceName = deviceType === 'mobile' ? 'Chrome Mobile' : 'Chrome Desktop';
    } else if (userAgent.includes('Firefox')) {
      deviceName = deviceType === 'mobile' ? 'Firefox Mobile' : 'Firefox Desktop';
    } else if (userAgent.includes('Safari')) {
      deviceName = deviceType === 'mobile' ? 'Safari Mobile' : 'Safari Desktop';
    } else if (userAgent.includes('Edge')) {
      deviceName = 'Microsoft Edge';
    }
    
    const session = await prisma.session.create({
      data: {
        userId: userId,
        userType: userType,
        token: token,
        expiresAt: expiresAt,
        createdAt: new Date()
      }
    });
    
    console.log(`✅ Session créée:`, {
      sessionId: session.id,
      userId: userId,
      userType: userType,
      deviceName: deviceName,
      deviceType: deviceType,
      ipAddress: ipAddress,
      expiresAt: expiresAt
    });
    
    return session;
  } catch (error) {
    console.error('❌ Erreur création session:', error);
    throw error;
  }
};

// Nettoyer les sessions expirées
const cleanupExpiredSessions = async () => {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
    
    if (result.count > 0) {
      console.log(`🧹 ${result.count} sessions expirées supprimées`);
    }
    
    return result.count;
  } catch (error) {
    console.error('❌ Erreur nettoyage sessions:', error);
    throw error;
  }
};

// Terminer toutes les sessions d'un utilisateur (sauf la session courante)
const terminateAllOtherSessions = async (userId, userType, currentToken) => {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        userId: userId,
        userType: userType,
        token: {
          not: currentToken
        }
      }
    });
    
    console.log(`🔒 ${result.count} autres sessions terminées pour l'utilisateur ${userId}`);
    return result.count;
  } catch (error) {
    console.error('❌ Erreur suppression sessions:', error);
    throw error;
  }
};

// Obtenir les informations de localisation basées sur l'IP (simulation)
const getLocationFromIP = (ipAddress) => {
  // En production, tu pourrais utiliser une API comme ipapi.co ou ipinfo.io
  // Pour l'instant, on simule avec des données fictives
  const locations = [
    'Paris, France',
    'Lyon, France', 
    'Marseille, France',
    'Toulouse, France',
    'Nice, France',
    'Nantes, France',
    'Montpellier, France',
    'Strasbourg, France',
    'Bordeaux, France',
    'Lille, France'
  ];
  
  // Générer une localisation basée sur l'IP (simulation)
  const hash = ipAddress.split('.').reduce((acc, part) => acc + parseInt(part), 0);
  return locations[hash % locations.length];
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  requireRole,
  requireStatus,
  createSession,
  cleanupExpiredSessions,
  terminateAllOtherSessions,
  getLocationFromIP,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
