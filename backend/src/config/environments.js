// Configuration des environnements
const environments = {
  development: {
    frontendUrl: 'http://localhost:5173',
    verifyPath: '/verifier-certificat'
  },
  production: {
    frontendUrl: 'https://authcert.vercel.app', // URL de production Vercel
    verifyPath: '/verifier-certificat'
  }
};

/**
 * Obtenir l'URL de vérification selon l'environnement
 * @returns {string} URL complète de vérification
 */
function getVerifyUrl() {
  const env = process.env.NODE_ENV || 'development';
  const config = environments[env] || environments.development;
  
  // Priorité : FRONTEND_URL env var > config par défaut
  const frontendUrl = process.env.FRONTEND_URL || config.frontendUrl;
  const verifyPath = config.verifyPath;
  
  // Nettoyer l'URL pour éviter les doubles slashes
  const cleanFrontendUrl = frontendUrl.replace(/\/+$/, ''); // Supprimer les slashes en fin
  const cleanVerifyPath = verifyPath.replace(/^\/+/, '/'); // S'assurer qu'il y a un slash au début
  const fullUrl = `${cleanFrontendUrl}${cleanVerifyPath}`;
  
  console.log(`🌐 Configuration URL vérification:`, {
    environment: env,
    frontendUrl,
    verifyPath,
    fullUrl
  });
  
  return fullUrl;
}

/**
 * Obtenir l'URL du frontend selon l'environnement
 * @returns {string} URL du frontend
 */
function getFrontendUrl() {
  const env = process.env.NODE_ENV || 'development';
  const config = environments[env] || environments.development;
  
  return process.env.FRONTEND_URL || config.frontendUrl;
}

module.exports = {
  getVerifyUrl,
  getFrontendUrl,
  environments
};
