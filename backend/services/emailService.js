const emailjs = require('emailjs');

/**
 * Envoie un email de réinitialisation de mot de passe via EmailJS
 * @param {string} email
 * @param {string} resetLink
 * @param {string} userName
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendPasswordResetEmail(email, resetLink, userName = 'Utilisateur') {
  // Chargement des variables
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    console.warn("⚠️ EmailJS n'est pas configuré correctement. L'email ne sera pas envoyé.");
    return { success: false, error: 'EmailJS non configuré' };
  }

  try {
    const response = await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: email,
        user_name: userName,
        reset_link: resetLink
      },
      {
        publicKey: publicKey,
        privateKey: privateKey
      }
    );
    if (response.status === 200) {
      console.log(`✅ Email de réinitialisation envoyé à ${email} avec EmailJS`);
      return { success: true };
    } else {
      console.error('❌ Erreur EmailJS:', response);
      return { success: false, error: response.text || 'Erreur inconnue' };
    }
  } catch (error) {
    console.error('❌ Erreur EmailJS:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPasswordResetEmail
};