const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

/**
 * Envoie un email de réinitialisation de mot de passe via l'API REST EmailJS.
 *
 * Prérequis EmailJS :
 *  - Variables d'env : EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY
 *  - Dans le dashboard EmailJS (Account > Security), activer
 *    "Allow EmailJS API for non-browser applications" pour autoriser cet appel serveur.
 *  - Le template doit exposer les variables : {{to_email}}, {{user_name}}, {{reset_link}}
 *
 * @param {string} email
 * @param {string} resetLink
 * @param {string} userName
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendPasswordResetEmail(email, resetLink, userName = 'Utilisateur') {
  const {
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    EMAILJS_PUBLIC_KEY,
    EMAILJS_PRIVATE_KEY
  } = process.env;

  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY) {
    const error = 'Configuration EmailJS incomplète (vérifiez les variables EMAILJS_* dans .env)';
    console.error(`❌ ${error}`);
    return { success: false, error };
  }

  try {
    const response = await fetch(EMAILJS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        accessToken: EMAILJS_PRIVATE_KEY,
        template_params: {
          to_email: email,
          user_name: userName,
          reset_link: resetLink
        }
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`❌ Erreur d'envoi email EmailJS (HTTP ${response.status}):`, detail);
      return { success: false, error: `EmailJS HTTP ${response.status}: ${detail}` };
    }

    console.log(`✅ Email de réinitialisation envoyé à ${email} via EmailJS`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Erreur d'envoi email EmailJS:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPasswordResetEmail
};
