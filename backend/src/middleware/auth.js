// Middlewares et helpers d'authentification / sessions.
// La logique vit dans config/jwt.js ; ce module l'expose comme couche "middleware".
const {
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
} = require('../config/jwt');

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
