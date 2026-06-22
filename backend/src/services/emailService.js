const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'in-v3.mailjet.com',
  port: 587,
  auth: {
    user: process.env.MJ_APIKEY_PUBLIC,
    pass: process.env.MJ_APIKEY_PRIVATE
  }
});

/**
 * Envoie un email de réinitialisation de mot de passe via Mailjet+Nodemailer
 * @param {string} email
 * @param {string} resetLink
 * @param {string} userName
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendPasswordResetEmail(email, resetLink, userName = 'Utilisateur') {
  try {
    const result = await transporter.sendMail({
      from: `"AuthCert" <${process.env.MAILJET_SENDER}>`,
      to: email,
      subject: "Réinitialisation de votre mot de passe AuthCert",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #F43F5E;">AuthCert</h1>
          </div>
          <p>Bonjour <b>${userName}</b>,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #F43F5E; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p>Ce lien est valable <strong>1 heure</strong>.<br>Si vous n'avez pas demandé cette action, ignorez cet email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="text-align: center; font-size: 12px; color: #777;">
            Ceci est un email automatique, merci de ne pas y répondre.
          </p>
        </div>
      `
    });
    console.log(`✅ Email de réinitialisation envoyé à ${email} via Mailjet`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Erreur d'envoi email Mailjet:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPasswordResetEmail
};