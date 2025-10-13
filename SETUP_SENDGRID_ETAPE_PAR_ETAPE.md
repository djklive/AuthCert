# 📧 Configuration SendGrid - Étape par Étape

## 🎯 Objectif

Configurer SendGrid pour envoyer de vrais emails de réinitialisation de mot de passe.

---

## 📋 Prérequis

- ✅ Compte email valide (Gmail, Outlook, etc.)
- ✅ Optionnel : Nom de domaine (pour production)

---

## 🚀 Étape 1 : Créer un Compte SendGrid

### **1.1 Inscription**

1. Va sur **[https://signup.sendgrid.com/](https://signup.sendgrid.com/)**
2. Clique **"Start for free"**
3. Remplis le formulaire :
   - Email : Ton email
   - Mot de passe : Choisis un mot de passe sécurisé
4. Clique **"Create Account"**
5. **Vérifie ton email** (clique le lien reçu)

### **1.2 Compléter le profil**

1. Connecte-toi sur **[https://app.sendgrid.com/](https://app.sendgrid.com/)**
2. Réponds aux questions :
   - **Role** : Developer
   - **Company Size** : 1-10
   - **Use Case** : Transactional Emails
   - **Purpose** : Password Reset
3. Clique **"Get Started"**

---

## 🔑 Étape 2 : Créer une API Key

### **2.1 Accéder aux API Keys**

1. Dans le dashboard SendGrid
2. Clique **"Settings"** (menu gauche)
3. Clique **"API Keys"**

### **2.2 Créer la clé**

1. Clique **"Create API Key"**
2. Remplis :
   - **API Key Name** : `AuthCert-PasswordReset`
   - **API Key Permissions** : **Full Access** (ou "Mail Send" uniquement)
3. Clique **"Create & View"**

### **2.3 Copier la clé**

```
⚠️ IMPORTANT : Copie cette clé MAINTENANT !
Tu ne pourras plus la revoir après avoir fermé cette fenêtre.
```

Exemple de clé :
```
SG.abc123xyz789_abcdefghijklmnopqrstuvwxyz1234567890
```

**Sauvegarde-la** quelque part temporairement (notes, fichier texte)

---

## ✉️ Étape 3 : Vérifier un Expéditeur

### **Option A : Single Sender Verification** (Recommandé pour débuter)

1. Menu **"Settings"** → **"Sender Authentication"**
2. Section **"Single Sender Verification"**
3. Clique **"Create New Sender"** ou **"Verify a Single Sender"**
4. Remplis le formulaire :
   ```
   From Name:     AuthCert
   From Email:    noreply@ton-email.com (ou ton email perso)
   Reply To:      support@ton-email.com (ou ton email)
   Company:       AuthCert
   Address:       123 Rue Example
   City:          Yaoundé (ou ta ville)
   Country:       Cameroon (ou ton pays)
   ```
5. Clique **"Create"**
6. **Vérifie ton email** :
   - SendGrid envoie un email à `noreply@ton-email.com`
   - Clique le lien de vérification
7. ✅ **Statut passe à "Verified"**

### **Option B : Domain Authentication** (Pour production)

**Plus complexe mais professionnel**

1. Nécessite un **nom de domaine** (ex: authcert.com)
2. Configure les enregistrements **DNS** (CNAME)
3. SendGrid vérifie le domaine
4. Tu peux ensuite envoyer depuis `noreply@authcert.com`

**Pour plus tard** - Utilise d'abord l'Option A

---

## 💻 Étape 4 : Installation du Package

### **4.1 Installer SendGrid**

```bash
cd backend
npm install @sendgrid/mail
```

### **4.2 Vérifier l'installation**

```bash
# Vérifie que c'est dans package.json
cat package.json | grep sendgrid
```

**Résultat attendu** :
```json
"@sendgrid/mail": "^8.1.4"
```

---

## ⚙️ Étape 5 : Configuration

### **5.1 Ajouter les variables d'environnement**

Ouvre `backend/.env` et ajoute :

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.abc123xyz789...  # Ta clé copiée à l'étape 2
SENDGRID_FROM_EMAIL=noreply@ton-email.com  # Email vérifié à l'étape 3
SENDGRID_FROM_NAME=AuthCert

# Mode
NODE_ENV=development  # Pour tests (affiche lien dans modal)
# NODE_ENV=production  # Pour production (envoie email)

# Frontend URL
FRONTEND_URL=http://localhost:5173  # Dev
# FRONTEND_URL=https://authcert.com  # Prod
```

### **5.2 Vérifier le fichier**

```bash
# Affiche les variables (sans valeurs sensibles)
grep SENDGRID backend/.env
```

**Résultat attendu** :
```
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@...
SENDGRID_FROM_NAME=AuthCert
```

---

## 🧪 Étape 6 : Tester

### **6.1 Test Basique**

Crée un fichier `backend/test-sendgrid.js` :

```javascript
require('dotenv').config();
const { sendPasswordResetEmail } = require('./services/emailService');

async function testEmail() {
  console.log('🧪 Test envoi email...');
  console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Configurée' : '❌ Manquante');
  console.log('SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);
  
  const testEmail = 'ton-email-perso@example.com'; // CHANGE ICI avec ton email
  const testLink = 'http://localhost:5173/reset-password?token=test123';
  
  const result = await sendPasswordResetEmail(testEmail, testLink, 'Test User');
  
  if (result.success) {
    console.log('✅ Email envoyé avec succès ! Vérifie ta boîte email.');
  } else {
    console.error('❌ Erreur:', result.error);
  }
}

testEmail();
```

Exécute :
```bash
cd backend
node test-sendgrid.js
```

**Résultat attendu** :
```
🧪 Test envoi email...
SENDGRID_API_KEY: ✅ Configurée
SENDGRID_FROM_EMAIL: noreply@ton-email.com
✅ SendGrid configuré
✅ Email de réinitialisation envoyé à ton-email-perso@example.com via SendGrid
✅ Email envoyé avec succès ! Vérifie ta boîte email.
```

**Vérifie ta boîte email** (et les spams) ! 📧

---

## 🎯 Étape 7 : Tester avec l'Application

### **7.1 Mode Production (avec emails)**

Modifie `backend/.env` :
```env
NODE_ENV=production  # ← Change ici
```

Redémarre le serveur :
```bash
taskkill /f /im node.exe
cd backend
npm start
```

### **7.2 Test complet**

1. Va sur `http://localhost:5173/auth`
2. Clique **"Mot de passe oublié ?"**
3. Saisit **ton email perso** (celui vérifié dans SendGrid)
4. Sélectionne "Apprenant"
5. Clique **"Envoyer le lien"**

**Résultats** :
- ✅ Modal : "Email envoyé !" (SANS le lien affiché)
- ✅ Console serveur : "✅ Email envoyé via SendGrid"
- ✅ **Vérifie ton email** : Tu dois recevoir un bel email !
- ✅ Clique le lien dans l'email
- ✅ Réinitialise ton mot de passe

---

## 🐛 Dépannage

### **Erreur : "Unauthorized" (401)**

**Cause** : API Key invalide

**Solution** :
1. Vérifie que `SENDGRID_API_KEY` dans `.env` est correct
2. Vérifie qu'il n'y a pas d'espaces avant/après
3. Recrée une nouvelle API Key si nécessaire

---

### **Erreur : "Forbidden" (403)**

**Cause** : Email expéditeur non vérifié

**Solution** :
1. Va sur SendGrid → Settings → Sender Authentication
2. Vérifie que ton email a le statut **"Verified"**
3. Si non : Vérifie l'email de confirmation SendGrid
4. `SENDGRID_FROM_EMAIL` doit correspondre EXACTEMENT

---

### **Email non reçu**

**Vérifications** :
1. ✅ Vérifie les **spams/indésirables**
2. ✅ Vérifie que l'email est correct
3. ✅ Console serveur dit "✅ Email envoyé" ?
4. ✅ SendGrid Dashboard → Activity → Email Activity
   - Vérifie le statut : "Delivered" ou "Bounced" ?

**Si "Bounced"** :
- Email invalide
- Boîte pleine
- Serveur destinataire rejette

---

### **Erreur : "SENDGRID_API_KEY non configurée"**

**Cause** : Variable d'environnement manquante

**Solution** :
```bash
# Vérifie le fichier .env
cat backend/.env | grep SENDGRID

# Doit afficher :
SENDGRID_API_KEY=SG...
```

Si vide :
1. Vérifie que tu as bien copié la clé
2. Vérifie qu'il n'y a pas de guillemets autour
3. Redémarre le serveur après modification

---

## 📊 Dashboard SendGrid

### **Vérifier l'activité** :

1. **Dashboard SendGrid**
2. Menu gauche → **"Activity"**
3. Onglet **"Email Activity"**
4. Voir tous les emails envoyés :
   - ✅ **Delivered** : Email reçu
   - ⚠️ **Processed** : En cours
   - ❌ **Bounced** : Échec
   - ❌ **Dropped** : Bloqué (spam, invalide)

---

## 🎨 Personnaliser le Template Email

### **Variables disponibles** :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `${email}` | Email destinataire | user@example.com |
| `${resetLink}` | Lien complet | https://... |
| `${userName}` | Nom utilisateur | Jean Dupont |

### **Modifier le design** :

**Fichier** : `backend/services/emailService.js`

**Ligne HTML** (ligne 42-160) :
- Change les couleurs (#F43F5E)
- Ajoute ton logo
- Modifie le texte
- Change la mise en page

**Exemple : Ajouter un logo** :
```html
<div class="header">
  <img src="https://authcert.com/logo.png" alt="Logo" style="width: 60px; height: 60px;">
  <h1>🔐 AuthCert</h1>
</div>
```

---

## 💰 Limites Gratuites

### **SendGrid Free** :
- **100 emails/jour**
- Parfait pour :
  - Tests
  - Petite application
  - MVP

**Dépassement** ?
- Plan Essentials : $19.95/mois (50 000 emails)
- Plan Pro : $89.95/mois (100 000 emails)

### **Surveiller l'usage** :
1. Dashboard SendGrid
2. **"Stats"** → **"Overview"**
3. Voir le nombre d'emails envoyés

---

## 🔄 Basculer entre Dev et Prod

### **Mode Développement** (lien affiché) :
```env
NODE_ENV=development
```

**Comportement** :
- Lien affiché dans le modal
- Pas d'email envoyé
- Pratique pour tester

### **Mode Production** (email envoyé) :
```env
NODE_ENV=production
```

**Comportement** :
- Email envoyé via SendGrid
- Lien non affiché
- Expérience utilisateur réelle

---

## ✅ Checklist Configuration

### **Avant de commencer** :
- [ ] Compte SendGrid créé
- [ ] Email vérifié
- [ ] Profil complété

### **Configuration SendGrid** :
- [ ] API Key créée
- [ ] API Key copiée
- [ ] Single Sender vérifié
- [ ] Email de vérification confirmé

### **Configuration Backend** :
- [ ] Package `@sendgrid/mail` installé
- [ ] Fichier `emailService.js` créé
- [ ] Variables `.env` configurées :
  - [ ] `SENDGRID_API_KEY`
  - [ ] `SENDGRID_FROM_EMAIL`
  - [ ] `SENDGRID_FROM_NAME`
  - [ ] `NODE_ENV`
  - [ ] `FRONTEND_URL`
- [ ] Import ajouté dans `server.js`
- [ ] Route modifiée pour utiliser le service

### **Tests** :
- [ ] Test basique (`test-sendgrid.js`)
- [ ] Test avec l'application
- [ ] Email reçu
- [ ] Lien fonctionne
- [ ] Réinitialisation réussie

---

## 🎯 Commandes Rapides

### **Installation** :
```bash
cd backend
npm install @sendgrid/mail
```

### **Test** :
```bash
node test-sendgrid.js
```

### **Redémarrage** :
```bash
taskkill /f /im node.exe
npm start
```

---

## 📧 Exemple d'Email Reçu

```
De: AuthCert <noreply@ton-domaine.com>
À: user@example.com
Sujet: Réinitialisation de votre mot de passe AuthCert

┌──────────────────────────────────────────┐
│                                          │
│          🔐 AuthCert                     │
│   Réinitialisation de mot de passe       │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  Bonjour Cher utilisateur,               │
│                                          │
│  Vous avez demandé la réinitialisation   │
│  de votre mot de passe sur AuthCert.     │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Réinitialiser mon mot de passe    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ⏱️ Important : Lien valable 1h         │
│                                          │
│  ⚠️ Vous n'avez rien demandé ?          │
│  Ignorez cet email.                      │
│                                          │
├──────────────────────────────────────────┤
│  © 2025 AuthCert                         │
│  authcert.com | Support                  │
└──────────────────────────────────────────┘
```

---

## 🚀 Pour Déployer en Production

### **1. Variables d'environnement** :

**Sur Railway/Vercel/Heroku** :
```
SENDGRID_API_KEY=SG.abc123...
SENDGRID_FROM_EMAIL=noreply@authcert.com
SENDGRID_FROM_NAME=AuthCert
NODE_ENV=production
FRONTEND_URL=https://authcert.vercel.app
```

### **2. Domain Authentication** :

**Si tu as un domaine** :
1. SendGrid → Settings → Sender Authentication
2. **"Authenticate Your Domain"**
3. Suis les instructions pour configurer DNS
4. Exemples de CNAME à ajouter :
   ```
   em1234.authcert.com → u1234.wl.sendgrid.net
   s1._domainkey.authcert.com → s1.domainkey.u1234.wl.sendgrid.net
   ```
5. Attends la vérification (quelques minutes à quelques heures)
6. ✅ Tu peux envoyer depuis `noreply@authcert.com`

---

## 💡 Astuces

### **Tester sans consommer le quota** :
```env
# Garde en développement pour tester
NODE_ENV=development
```

### **Voir les emails envoyés** :
- Dashboard SendGrid → Activity
- Filtre par date, email, statut

### **Analyser les performances** :
- Dashboard → Stats → Overview
- Taux de délivrabilité
- Taux d'ouverture (si tracking activé)

---

## 🎊 Résumé

### **Configuration complète en 7 étapes** :

1. ✅ Créer compte SendGrid
2. ✅ Créer API Key
3. ✅ Vérifier expéditeur (Single Sender)
4. ✅ Installer package npm
5. ✅ Configurer variables `.env`
6. ✅ Créer `emailService.js`
7. ✅ Modifier `server.js`

**Temps estimé** : 15-20 minutes

---

## 🎯 Statut Actuel

### **✅ Déjà fait** :
- ✅ Fichier `emailService.js` créé
- ✅ Import ajouté dans `server.js`
- ✅ Route modifiée pour utiliser le service

### **📝 À faire par toi** :
- [ ] Créer compte SendGrid (5 min)
- [ ] Créer API Key (2 min)
- [ ] Vérifier expéditeur (3 min)
- [ ] Installer package (1 min)
- [ ] Configurer `.env` (2 min)
- [ ] Tester (5 min)

**Total : ~18 minutes** ⏱️

---

## 📞 Liens Utiles

- **SendGrid Dashboard** : [https://app.sendgrid.com/](https://app.sendgrid.com/)
- **Documentation** : [https://docs.sendgrid.com/](https://docs.sendgrid.com/)
- **Node.js Guide** : [https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs](https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs)
- **API Keys** : [https://app.sendgrid.com/settings/api_keys](https://app.sendgrid.com/settings/api_keys)
- **Sender Auth** : [https://app.sendgrid.com/settings/sender_auth](https://app.sendgrid.com/settings/sender_auth)

---

**Bon courage pour la configuration ! C'est simple et rapide ! 🚀**

