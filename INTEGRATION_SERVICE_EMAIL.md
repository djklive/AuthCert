# 📧 Guide d'Intégration d'un Service d'Email

## 🎯 Objectif

Envoyer de vrais emails pour la récupération de mot de passe au lieu d'afficher le lien dans la console.

---

## 🔍 Comparaison des Services

| Service | Prix | Facilité | Fiabilité | Gratuit |
|---------|------|----------|-----------|---------|
| **SendGrid** | 💰💰 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 100 emails/jour |
| **Mailgun** | 💰💰 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 5000 emails/mois |
| **Brevo** (ex-Sendinblue) | 💰 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 300 emails/jour |
| **Nodemailer (Gmail)** | 💰 | ⭐⭐⭐ | ⭐⭐⭐ | Gratuit |
| **AWS SES** | 💰 | ⭐⭐ | ⭐⭐⭐⭐⭐ | 62000 emails/mois |

**Recommandation** : **SendGrid** ou **Brevo** (plus simple et généreux en version gratuite)

---

## 🚀 Option 1 : SendGrid (Recommandé)

### **Avantages** :
- ✅ 100 emails/jour **gratuits**
- ✅ Interface simple
- ✅ Délivrabilité excellente
- ✅ SDK officiel Node.js
- ✅ Templates HTML

### **Étape 1 : Inscription**

1. Va sur [https://sendgrid.com/](https://sendgrid.com/)
2. Clique **"Start for free"**
3. Crée un compte
4. Vérifie ton email

### **Étape 2 : Créer une API Key**

1. Dashboard SendGrid → **Settings** → **API Keys**
2. Clique **"Create API Key"**
3. Nom : `AuthCert Password Reset`
4. Permissions : **Full Access** (ou "Mail Send" uniquement)
5. Clique **"Create & View"**
6. **Copie la clé** (tu ne la reverras plus !)

Exemple de clé :
```
SG.abc123xyz789...
```

### **Étape 3 : Vérifier un domaine/email expéditeur**

1. **Settings** → **Sender Authentication**
2. Deux options :

**Option A : Single Sender Verification** (plus simple) :
- Clique **"Verify a Single Sender"**
- Remplis le formulaire :
  - From Name: `AuthCert`
  - From Email: `noreply@ton-domaine.com` (ou ton email perso)
  - Reply To: `support@ton-domaine.com`
- Clique **"Create"**
- **Vérifie l'email** dans ta boîte

**Option B : Domain Authentication** (professionnel) :
- Nécessite un nom de domaine
- Configure DNS (CNAME, etc.)
- Plus complexe mais meilleur pour production

### **Étape 4 : Installation**

```bash
cd backend
npm install @sendgrid/mail
```

### **Étape 5 : Configuration**

Ajoute dans `backend/.env` :
```env
SENDGRID_API_KEY=SG.abc123xyz789...
SENDGRID_FROM_EMAIL=noreply@ton-domaine.com
SENDGRID_FROM_NAME=AuthCert
```

### **Étape 6 : Créer le service d'email**

Crée `backend/services/emailService.js` :

```javascript
const sgMail = require('@sendgrid/mail');

// Configurer SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Envoyer un email de réinitialisation de mot de passe
 * @param {string} email - Email du destinataire
 * @param {string} resetLink - Lien de réinitialisation
 * @param {string} userName - Nom de l'utilisateur (optionnel)
 */
async function sendPasswordResetEmail(email, resetLink, userName = '') {
  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL,
      name: process.env.SENDGRID_FROM_NAME
    },
    subject: 'Réinitialisation de votre mot de passe AuthCert',
    text: `Bonjour ${userName},\n\nVous avez demandé la réinitialisation de votre mot de passe.\n\nCliquez sur le lien ci-dessous pour créer un nouveau mot de passe :\n${resetLink}\n\nCe lien expire dans 1 heure.\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez cet email.\n\nCordialement,\nL'équipe AuthCert`,
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
          .header img {
            width: 60px;
            height: 60px;
            margin-bottom: 10px;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 40px 30px;
          }
          .content h2 {
            color: #333;
            margin-top: 0;
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
          }
          .warning-box {
            background: #FEF2F2;
            border-left: 4px solid #EF4444;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            background: #f9fafb;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 AuthCert</h1>
            <p style="color: white; margin: 0;">Réinitialisation de mot de passe</p>
          </div>
          
          <div class="content">
            <h2>Bonjour ${userName || 'Cher utilisateur'},</h2>
            
            <p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>AuthCert</strong>.</p>
            
            <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">
                Réinitialiser mon mot de passe
              </a>
            </div>
            
            <div class="info-box">
              <strong>⏱️ Important :</strong> Ce lien est valable pendant <strong>1 heure</strong> seulement.
            </div>
            
            <p>Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 12px;">
              ${resetLink}
            </p>
            
            <div class="warning-box">
              <strong>⚠️ Vous n'avez rien demandé ?</strong><br>
              Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email. Votre mot de passe reste inchangé.
            </div>
          </div>
          
          <div class="footer">
            <p>© 2025 AuthCert - Certification sécurisée par blockchain</p>
            <p>
              <a href="https://authcert.com" style="color: #F43F5E; text-decoration: none;">authcert.com</a> | 
              <a href="mailto:support@authcert.com" style="color: #F43F5E; text-decoration: none;">Support</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Email de réinitialisation envoyé à ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur envoi email SendGrid:', error);
    if (error.response) {
      console.error('Détails:', error.response.body);
    }
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPasswordResetEmail
};
```

### **Étape 7 : Utiliser le service dans server.js**

**Ligne 1** : Importer le service (en haut du fichier)
```javascript
const { sendPasswordResetEmail } = require('./services/emailService');
```

**Ligne 1580-1581** : Remplacer le TODO par :
```javascript
// Envoyer l'email de réinitialisation
if (process.env.NODE_ENV === 'production') {
  const result = await sendPasswordResetEmail(email, resetLink);
  if (!result.success) {
    console.error('⚠️ Échec envoi email, mais token créé');
  }
}
```

**Code complet modifié** (lignes 1574-1588) :
```javascript
// En production, envoyer un email avec le lien
const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

console.log('📧 Lien de réinitialisation:', resetLink);
console.log(`✅ Token de réinitialisation créé pour ${email} (expire dans 1h)`);

// Envoyer l'email en production
if (process.env.NODE_ENV === 'production') {
  const result = await sendPasswordResetEmail(email, resetLink);
  if (!result.success) {
    console.error('⚠️ Échec envoi email, mais token créé en base');
  }
}

res.json({
  success: true,
  message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
  // En développement, retourner le lien pour faciliter les tests
  ...(process.env.NODE_ENV === 'development' && { resetLink })
});
```

---

## 🚀 Option 2 : Brevo (ex-Sendinblue)

### **Avantages** :
- ✅ 300 emails/jour **gratuits**
- ✅ Interface française
- ✅ Très simple
- ✅ Support SMTP

### **Installation** :
```bash
npm install @sendinblue/client
```

### **Configuration** `.env` :
```env
BREVO_API_KEY=xkeysib-abc123...
BREVO_FROM_EMAIL=noreply@ton-domaine.com
```

### **Service d'email** (`backend/services/emailService.js`) :
```javascript
const SibApiV3Sdk = require('@sendinblue/client');

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, 
  process.env.BREVO_API_KEY
);

async function sendPasswordResetEmail(email, resetLink, userName = '') {
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  
  sendSmtpEmail.subject = "Réinitialisation de votre mot de passe AuthCert";
  sendSmtpEmail.sender = { 
    name: "AuthCert", 
    email: process.env.BREVO_FROM_EMAIL 
  };
  sendSmtpEmail.to = [{ email, name: userName }];
  sendSmtpEmail.htmlContent = `
    <html>
      <body>
        <h2>Réinitialisation de mot de passe</h2>
        <p>Bonjour ${userName},</p>
        <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
        <a href="${resetLink}" style="background: #F43F5E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Réinitialiser mon mot de passe
        </a>
        <p>Ce lien expire dans 1 heure.</p>
        <p><small>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</small></p>
      </body>
    </html>
  `;

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Email envoyé via Brevo à ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur Brevo:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendPasswordResetEmail };
```

---

## 🚀 Option 3 : Mailgun

### **Avantages** :
- ✅ 5000 emails/mois **gratuits** (3 mois)
- ✅ Très fiable
- ✅ API simple

### **Installation** :
```bash
npm install mailgun.js form-data
```

### **Configuration** `.env` :
```env
MAILGUN_API_KEY=abc123...
MAILGUN_DOMAIN=mg.ton-domaine.com
MAILGUN_FROM_EMAIL=noreply@ton-domaine.com
```

### **Service d'email** :
```javascript
const formData = require('form-data');
const Mailgun = require('mailgun.js');

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY
});

async function sendPasswordResetEmail(email, resetLink, userName = '') {
  const data = {
    from: `AuthCert <${process.env.MAILGUN_FROM_EMAIL}>`,
    to: email,
    subject: 'Réinitialisation de votre mot de passe AuthCert',
    html: `
      <h2>Bonjour ${userName},</h2>
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p>
        <a href="${resetLink}" 
           style="background: #F43F5E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Réinitialiser mon mot de passe
        </a>
      </p>
      <p>Ce lien expire dans 1 heure.</p>
      <p><small>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</small></p>
    `
  };

  try {
    await mg.messages.create(process.env.MAILGUN_DOMAIN, data);
    console.log(`✅ Email envoyé via Mailgun à ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur Mailgun:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendPasswordResetEmail };
```

---

## 🚀 Option 4 : Nodemailer (Gmail)

### **Avantages** :
- ✅ **100% gratuit**
- ✅ Utilise ton compte Gmail
- ✅ Parfait pour dev/test

### **Inconvénients** :
- ❌ Limite : 500 emails/jour
- ❌ Configuration Gmail nécessaire

### **Installation** :
```bash
npm install nodemailer
```

### **Configuration Gmail** :

1. Va sur [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Active **"Validation en deux étapes"**
3. Va sur **"Mots de passe des applications"**
4. Crée un mot de passe pour "AuthCert"
5. Copie le mot de passe (16 caractères)

### **Configuration** `.env` :
```env
GMAIL_USER=ton-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop  # 16 caractères
```

### **Service d'email** :
```javascript
const nodemailer = require('nodemailer');

// Créer le transporteur
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

async function sendPasswordResetEmail(email, resetLink, userName = '') {
  const mailOptions = {
    from: `"AuthCert" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Réinitialisation de votre mot de passe AuthCert',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #F43F5E; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">🔐 AuthCert</h1>
        </div>
        
        <div style="padding: 30px; background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2>Bonjour ${userName || 'Cher utilisateur'},</h2>
          
          <p>Vous avez demandé la réinitialisation de votre mot de passe sur AuthCert.</p>
          
          <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background: #F43F5E; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          
          <div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 12px; margin: 20px 0;">
            <strong>⏱️ Important :</strong> Ce lien est valable pendant <strong>1 heure</strong> seulement.
          </div>
          
          <p>Si le bouton ne fonctionne pas, copiez-collez ce lien :</p>
          <p style="background: #f3f4f6; padding: 10px; word-break: break-all; font-size: 12px; border-radius: 4px;">
            ${resetLink}
          </p>
          
          <div style="background: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px; margin: 20px 0;">
            <strong>⚠️ Vous n'avez rien demandé ?</strong><br>
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre compte reste sécurisé.
          </div>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Cordialement,<br>
            L'équipe AuthCert
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© 2025 AuthCert - Tous droits réservés</p>
          <p>
            <a href="https://authcert.com" style="color: #F43F5E; text-decoration: none;">Site web</a> | 
            <a href="mailto:support@authcert.com" style="color: #F43F5E; text-decoration: none;">Support</a>
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email envoyé via Gmail à ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur Nodemailer:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendPasswordResetEmail };
```

---

## 🎯 Implémentation Recommandée (SendGrid)

### **Résumé Complet** :

#### **1. Installation**
```bash
cd backend
npm install @sendgrid/mail
```

#### **2. Variables d'environnement** (`.env`)
```env
SENDGRID_API_KEY=SG.abc123...
SENDGRID_FROM_EMAIL=noreply@ton-domaine.com
SENDGRID_FROM_NAME=AuthCert
NODE_ENV=production
FRONTEND_URL=https://authcert.com
```

#### **3. Créer `backend/services/emailService.js`**
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendPasswordResetEmail(email, resetLink, userName = '') {
  const msg = {
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL,
      name: process.env.SENDGRID_FROM_NAME
    },
    subject: 'Réinitialisation de votre mot de passe AuthCert',
    html: `[TEMPLATE HTML CI-DESSUS]`
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Email envoyé à ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur SendGrid:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendPasswordResetEmail };
```

#### **4. Modifier `backend/server.js`**

**En haut du fichier (avec les autres imports)** :
```javascript
const { sendPasswordResetEmail } = require('./services/emailService');
```

**Ligne 1574-1588 (remplacer le TODO)** :
```javascript
// En production, envoyer un email avec le lien
const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

console.log('📧 Lien de réinitialisation:', resetLink);
console.log(`✅ Token de réinitialisation créé pour ${email} (expire dans 1h)`);

// Envoyer l'email
if (process.env.NODE_ENV === 'production') {
  try {
    await sendPasswordResetEmail(email, resetLink, userName);
    console.log('✅ Email de réinitialisation envoyé avec succès');
  } catch (emailError) {
    console.error('⚠️ Erreur envoi email, mais token créé:', emailError);
    // On continue même si l'email échoue (token créé en base)
  }
}

res.json({
  success: true,
  message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
  // En développement, retourner le lien
  ...(process.env.NODE_ENV === 'development' && { resetLink })
});
```

---

## 🧪 Tests

### **Test en Développement** :
```bash
# Garde NODE_ENV=development
# Le lien s'affiche dans le modal
# Pas besoin d'email
```

### **Test en Production** :
```bash
# Change NODE_ENV=production
# Email envoyé via SendGrid
# Lien n'apparaît plus dans le modal
```

### **Test Manuel SendGrid** :
```bash
# Test rapide de l'API
node -e "
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('SG.abc123...');
sgMail.send({
  to: 'ton-email@example.com',
  from: 'noreply@ton-domaine.com',
  subject: 'Test SendGrid',
  text: 'Ça marche !'
}).then(() => console.log('✅ OK')).catch(e => console.error('❌', e));
"
```

---

## 🎨 Template Email Professionnel

### **Version Minimaliste** :
```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #F43F5E; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1>🔐 AuthCert</h1>
  </div>
  
  <div style="padding: 30px; background: white; border: 1px solid #ddd;">
    <h2>Réinitialisation de mot de passe</h2>
    <p>Bonjour,</p>
    <p>Cliquez sur le bouton ci-dessous :</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="background: #F43F5E; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block;">
        Réinitialiser mon mot de passe
      </a>
    </div>
    
    <p><small>Ce lien expire dans 1 heure.</small></p>
  </div>
</body>
</html>
```

---

## 🔧 Debugging

### **Email non reçu ?**

**1. Vérifier les logs** :
```bash
# Console serveur devrait afficher :
✅ Email envoyé à user@example.com
```

**2. Vérifier SendGrid Dashboard** :
- Activity → Email Activity
- Voir si l'email est "Delivered" ou "Bounced"

**3. Vérifier les spams** :
- L'email peut arriver dans les spams la première fois

**4. Vérifier l'adresse From** :
- Doit être vérifiée dans SendGrid
- Single Sender Verification OU Domain Authentication

### **Erreur "Unauthorized"** :
```
❌ 401 Unauthorized
```
**Solution** : Vérifie que `SENDGRID_API_KEY` est correct

### **Erreur "Forbidden"** :
```
❌ 403 Forbidden
```
**Solution** : L'email expéditeur n'est pas vérifié dans SendGrid

---

## 🎯 Choix Rapide

### **Pour débuter / dev** :
→ **Nodemailer (Gmail)** - Gratuit et simple

### **Pour production / petit budget** :
→ **Brevo** - 300 emails/jour gratuits

### **Pour production / sérieux** :
→ **SendGrid** - 100 emails/jour, très fiable

### **Pour grosse volumétrie** :
→ **AWS SES** - Très économique à grande échelle

---

## 📝 Modifications à Faire

### **Fichier 1 : `backend/services/emailService.js`** (CRÉER)
```javascript
// Copie le code de l'option choisie (SendGrid recommandé)
```

### **Fichier 2 : `backend/server.js`**

**Ligne 1 (avec les imports)** :
```javascript
const { sendPasswordResetEmail } = require('./services/emailService');
```

**Ligne 1574-1588 (remplacer)** :
```javascript
const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

console.log('📧 Lien de réinitialisation:', resetLink);
console.log(`✅ Token créé pour ${email} (expire dans 1h)`);

// Envoyer l'email en production
if (process.env.NODE_ENV === 'production') {
  try {
    await sendPasswordResetEmail(email, resetLink);
  } catch (emailError) {
    console.error('⚠️ Erreur envoi email:', emailError);
  }
}

res.json({
  success: true,
  message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
  ...(process.env.NODE_ENV === 'development' && { resetLink })
});
```

### **Fichier 3 : `backend/.env`**
```env
# SendGrid
SENDGRID_API_KEY=SG.abc123...
SENDGRID_FROM_EMAIL=noreply@ton-domaine.com
SENDGRID_FROM_NAME=AuthCert

# Configuration
NODE_ENV=production  # Ou development pour tests
FRONTEND_URL=https://authcert.com  # Ton domaine
```

---

## ✅ Résumé Ultra-Rapide

### **3 étapes seulement** :

1. **Choisis un service** (SendGrid recommandé)
2. **Crée `emailService.js`** avec le code correspondant
3. **Modifie `server.js`** pour l'utiliser

**C'est tout ! 🎉**

---

## 🎊 Résultat Final

**Mode Développement** :
```
Utilisateur demande réinitialisation
→ Lien affiché dans le modal
→ Clique directement
```

**Mode Production** :
```
Utilisateur demande réinitialisation
→ Email envoyé via SendGrid
→ Utilisateur clique le lien dans l'email
→ Réinitialise son mot de passe
```

---

**Pour l'instant, le mode dev fonctionne parfaitement ! 🎉**
**Ajoute l'envoi d'email quand tu veux déployer en production ! 🚀**

