/**
 * Utilitaire pour générer les URLs Supabase Storage
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const BUCKET_NAME = 'authcert-files';

/**
 * Génère une URL publique complète à partir d'un chemin relatif
 * @param {string} filePath - Chemin relatif du fichier (ex: "demandes-certificat/file.png")
 * @returns {string} URL publique complète
 */
function getPublicUrl(filePath) {
  // Nettoyer le chemin (enlever les slashes en début/fin)
  const cleanPath = filePath.replace(/^\/+|\/+$/g, '');
  
  // Générer l'URL publique Supabase
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${cleanPath}`;
}

/**
 * Génère une URL signée pour un fichier privé
 * @param {string} filePath - Chemin relatif du fichier
 * @param {number} expiresIn - Durée d'expiration en secondes (défaut: 1 heure)
 * @returns {Promise<string>} URL signée
 */
async function getSignedUrl(filePath, expiresIn = 3600) {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
  
  const supabase = createClient(SUPABASE_URL, supabaseKey);
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error('❌ Erreur génération URL signée:', error);
    throw new Error(error.message);
  }

  return data.signedUrl;
}

/**
 * Vérifie si une URL est déjà complète
 * @param {string} url - URL à vérifier
 * @returns {boolean} true si l'URL est complète
 */
function isCompleteUrl(url) {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
}

/**
 * Génère l'URL appropriée (publique ou signée) selon le contexte
 * @param {string} filePath - Chemin du fichier
 * @param {boolean} useSignedUrl - Utiliser une URL signée (pour fichiers privés)
 * @returns {Promise<string>} URL appropriée
 */
async function getAppropriateUrl(filePath, useSignedUrl = false) {
  if (isCompleteUrl(filePath)) {
    return filePath; // URL déjà complète
  }

  if (useSignedUrl) {
    return await getSignedUrl(filePath);
  } else {
    return getPublicUrl(filePath);
  }
}

module.exports = {
  getPublicUrl,
  getSignedUrl,
  isCompleteUrl,
  getAppropriateUrl
};

