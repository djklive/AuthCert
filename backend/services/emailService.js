const sgMail = require('@sendgrid/mail');

// Configurer SendGrid avec la clé API
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid configuré');
} else {
  console.warn('⚠️ SENDGRID_API_KEY non configurée - Les emails ne seront pas envoyés');
}

/**
 * Envoyer un email de réinitialisation de mot de passe
 * @param {string} email - Email du destinataire
 * @param {string} resetLink - Lien de réinitialisation
 * @param {string} userName - Nom de l'utilisateur (optionnel)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendPasswordResetEmail(email, resetLink, userName = '') {
  // Si SendGrid n'est pas configuré, retourner un succès silencieux
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`📧 Email de réinitialisation aurait été envoyé à ${email} (SendGrid non configuré)`);
    return { success: true };
  }

  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@authcert.com',
      name: process.env.SENDGRID_FROM_NAME || 'AuthCert'
    },
    subject: 'Réinitialisation de votre mot de passe AuthCert',
    text: `Bonjour ${userName || 'Cher utilisateur'},\n\nVous avez demandé la réinitialisation de votre mot de passe sur AuthCert.\n\nCliquez sur le lien ci-dessous pour créer un nouveau mot de passe :\n${resetLink}\n\nCe lien expire dans 1 heure.\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre compte reste sécurisé.\n\nCordialement,\nL'équipe AuthCert`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #F43F5E 0%, #EC4899 100%);
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 28px;
          }
          .header p {
            color: white;
            margin: 5px 0 0;
            font-size: 14px;
          }
          .content {
            padding: 40px 30px;
          }
          .content h2 {
            color: #333;
            margin-top: 0;
            font-size: 20px;
          }
          .button {
            display: inline-block;
            padding: 14px 30px;
            background: #F43F5E;
            color: white !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            transition: background 0.3s;
          }
          .button:hover {
            background: #DC2F4E;
          }
          .info-box {
            background: #EFF6FF;
            border-left: 4px solid #3B82F6;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
          }
          .warning-box {
            background: #FEF2F2;
            border-left: 4px solid #EF4444;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
          }
          .link-box {
            background: #F3F4F6;
            padding: 12px;
            border-radius: 4px;
            word-break: break-all;
            font-size: 12px;
            font-family: monospace;
            margin: 15px 0;
          }
          .footer {
            background: #F9FAFB;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6B7280;
            border-top: 1px solid #E5E7EB;
          }
          .footer a {
            color: #F43F5E;
            text-decoration: none;
          }
          .footer a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 AuthCert</h1>
            <p>Réinitialisation de mot de passe</p>
          </div>
          
          <div class="content">
            <h2>Bonjour ${userName || 'Cher utilisateur'},</h2>
            
            <p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>AuthCert</strong>.</p>
            
            <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe sécurisé :</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">
                Réinitialiser mon mot de passe
              </a>
            </div>
            
            <div class="info-box">
              <strong>⏱️ Important :</strong> Ce lien est valable pendant <strong>1 heure</strong> seulement.
            </div>
            
            <p>Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
            <div class="link-box">
              ${resetLink}
            </div>
            
            <div class="warning-box">
              <strong>⚠️ Vous n'avez rien demandé ?</strong><br>
              Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email. Votre mot de passe reste inchangé et votre compte est sécurisé.
            </div>
            
            <p style="margin-top: 30px; color: #6B7280; font-size: 14px;">
              Cordialement,<br>
              <strong>L'équipe AuthCert</strong>
            </p>
          </div>
          
          <div class="footer">
            <p>© 2025 AuthCert - Certification sécurisée par blockchain</p>
            <p>
              <a href="https://authcert.com">authcert.com</a> | 
              <a href="mailto:support@authcert.com">Support</a> | 
              <a href="https://authcert.com/privacy">Confidentialité</a>
            </p>
            <p style="margin-top: 10px; color: #9CA3AF;">
              Cet email a été envoyé à ${email} car une demande de réinitialisation de mot de passe a été effectuée.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Email de réinitialisation envoyé à ${email} via SendGrid`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi email SendGrid:', error);
    
    // Logs détaillés pour debugging
    if (error.response) {
      console.error('Détails erreur SendGrid:', {
        statusCode: error.response.statusCode,
        body: error.response.body,
        headers: error.response.headers
      });
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Envoyer un email de notification (pour usage futur)
 * @param {string} email - Email du destinataire
 * @param {string} subject - Sujet de l'email
 * @param {string} htmlContent - Contenu HTML
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendNotificationEmail(email, subject, htmlContent) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`📧 Email de notification aurait été envoyé à ${email}`);
    return { success: true };
  }

  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@authcert.com',
      name: process.env.SENDGRID_FROM_NAME || 'AuthCert'
    },
    subject,
    html: htmlContent
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Email de notification envoyé à ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi notification:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendNotificationEmail
};

