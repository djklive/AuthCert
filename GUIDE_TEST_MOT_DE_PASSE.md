# 🧪 Guide de Test - Récupération de Mot de Passe

## 🚀 Préparation

### **1. Appliquer la migration Prisma**

```bash
# Arrêter le serveur
taskkill /f /im node.exe

# Appliquer le schéma
cd backend
npx prisma db push

# Générer le client
npx prisma generate

# Redémarrer le serveur
npm start
```

### **2. Lancer le frontend**

```bash
# Dans un nouveau terminal
npm run dev
```

---

## 🧪 Scénarios de Test

### **Test 1 : Demande de réinitialisation (Apprenant)**

#### Étapes :
1. ✅ Va sur `http://localhost:5173/auth`
2. ✅ Clique sur **"Mot de passe oublié ?"**
3. ✅ Modal s'ouvre
4. ✅ Saisit un email existant (ex: email d'un apprenant en DB)
5. ✅ Sélectionne **"Apprenant"**
6. ✅ Clique **"Envoyer le lien"**

#### Résultats attendus :
- ✅ Modal affiche **"Email envoyé !"**
- ✅ **Lien affiché** dans le modal (mode dev)
- ✅ **Console serveur** :
  ```
  📧 Lien de réinitialisation: http://localhost:5173/reset-password?token=abc123...
  ✅ Token de réinitialisation créé pour xxx@example.com (expire dans 1h)
  ```

---

### **Test 2 : Demande de réinitialisation (Établissement)**

#### Étapes :
1. ✅ Même procédure que Test 1
2. ✅ Sélectionne **"Établissement"**

#### Résultats attendus :
- ✅ Même comportement
- ✅ Token créé avec `userType: 'etablissement'`

---

### **Test 3 : Email inexistant**

#### Étapes :
1. ✅ Saisit email inexistant : `test.inexistant.123@fake.com`
2. ✅ Clique "Envoyer"

#### Résultats attendus :
- ✅ **Même message** : "Si cet email existe..."
- ✅ **Console serveur** :
  ```
  ⚠️ Tentative de réinitialisation pour email inexistant: test.inexistant.123@fake.com
  ```
- ✅ **Aucun token créé** (sécurité)
- ✅ **Pas de révélation** que l'email n'existe pas

---

### **Test 4 : Réinitialisation avec token valide**

#### Étapes :
1. ✅ Copie le lien affiché dans le modal (ou depuis console)
2. ✅ **Colle le lien** dans le navigateur (ou clique dessus)
3. ✅ Page `/reset-password?token=...` s'ouvre
4. ✅ **Vérification automatique** du token (loader)
5. ✅ Formulaire affiché avec email destinataire
6. ✅ Saisit nouveau mot de passe : `NouveauMDP123`
7. ✅ Confirme : `NouveauMDP123`
8. ✅ Clique **"Réinitialiser le mot de passe"**

#### Résultats attendus :
- ✅ **Succès affiché** : "Mot de passe réinitialisé !"
- ✅ **Console serveur** :
  ```
  ✅ Mot de passe réinitialisé pour xxx@example.com
  ```
- ✅ **Redirection automatique** vers `/auth` après 3 secondes
- ✅ **Connexion possible** avec le nouveau mot de passe

---

### **Test 5 : Vérifier invalidation des sessions**

#### Étapes :
1. ✅ **Avant réinitialisation** :
   - Connecte-toi avec l'ancien mot de passe
   - Va sur **Profil** → **Sécurité** → Note le nombre de sessions
2. ✅ **Réinitialise** le mot de passe (Test 4)
3. ✅ **Retourne** sur l'onglet où tu étais connecté

#### Résultats attendus :
- ✅ **Session invalidée** automatiquement
- ✅ Redirection vers `/auth`
- ✅ En base : `sessions` supprimées pour cet utilisateur

---

### **Test 6 : Token expiré**

#### Étapes :
1. ✅ Demande un token
2. ✅ **Modifie en base de données** :
   ```sql
   UPDATE password_resets 
   SET "expiresAt" = NOW() - INTERVAL '1 hour' 
   WHERE email = 'test@example.com' AND used = false;
   ```
3. ✅ Clique sur le lien

#### Résultats attendus :
- ✅ Page affiche : **"Lien invalide ou expiré"**
- ✅ Bouton **"Retour à la connexion"**
- ✅ Formulaire **non affiché**

---

### **Test 7 : Token déjà utilisé**

#### Étapes :
1. ✅ Utilise un token une **première fois** (Test 4)
2. ✅ **Clique à nouveau** sur le même lien

#### Résultats attendus :
- ✅ Page affiche : **"Ce lien a déjà été utilisé"**
- ✅ Impossible de réutiliser

---

### **Test 8 : Validation mot de passe**

#### Étapes :
1. ✅ Ouvre un lien valide
2. ✅ Saisit mot de passe : `12345` (trop court)
3. ✅ Confirme : `12345`
4. ✅ Clique "Réinitialiser"

#### Résultats attendus :
- ✅ Erreur : **"Le mot de passe doit contenir au moins 6 caractères"**
- ✅ Formulaire reste affiché

---

### **Test 9 : Mots de passe ne correspondent pas**

#### Étapes :
1. ✅ Saisit : `Password123`
2. ✅ Confirme : `Password456`
3. ✅ Clique "Réinitialiser"

#### Résultats attendus :
- ✅ Erreur : **"Les mots de passe ne correspondent pas"**

---

### **Test 10 : Multiples demandes (invalidation)**

#### Étapes :
1. ✅ Demande token #1 pour `test@example.com`
2. ✅ **Sans utiliser** le token #1, demande token #2 pour le même email
3. ✅ Essaie d'utiliser le **token #1** (ancien)

#### Résultats attendus :
- ✅ Token #1 : **"Ce lien a déjà été utilisé"** (invalidé automatiquement)
- ✅ Token #2 : **Fonctionne** normalement
- ✅ En DB : Token #1 marqué `used: true`

---

## 🎯 Checklist Complète

### **Avant de tester** :
- [ ] Migration Prisma appliquée
- [ ] Serveur backend démarré
- [ ] Frontend lancé
- [ ] Au moins 1 utilisateur en DB (apprenant ou établissement)

### **Tests fonctionnels** :
- [ ] Test 1 : Demande apprenant ✅
- [ ] Test 2 : Demande établissement ✅
- [ ] Test 3 : Email inexistant (sécurité) ✅
- [ ] Test 4 : Réinitialisation réussie ✅
- [ ] Test 5 : Sessions invalidées ✅
- [ ] Test 6 : Token expiré ✅
- [ ] Test 7 : Token utilisé ✅
- [ ] Test 8 : MDP trop court ✅
- [ ] Test 9 : MDP différents ✅
- [ ] Test 10 : Invalidation anciens tokens ✅

### **Tests UI** :
- [ ] Modal s'ouvre correctement
- [ ] Modal se ferme correctement
- [ ] Page de réinitialisation responsive
- [ ] Messages d'erreur clairs
- [ ] Animations fluides
- [ ] Bouton "Retour" fonctionne
- [ ] Redirection automatique après succès

---

## 🔍 Vérifications en Base de Données

### **Après Test 1** :
```sql
SELECT * FROM password_resets 
WHERE email = 'test@example.com' 
ORDER BY "createdAt" DESC 
LIMIT 1;
```

**Attendu** :
```
id | email            | userType  | token      | expiresAt           | used  | usedAt | createdAt
1  | test@example.com | apprenant | abc123...  | 2025-10-12 15:30:00 | false | null   | 2025-10-12 14:30:00
```

---

### **Après Test 4** :
```sql
SELECT * FROM password_resets 
WHERE email = 'test@example.com' AND used = true 
ORDER BY "createdAt" DESC 
LIMIT 1;
```

**Attendu** :
```
used  | usedAt
true  | 2025-10-12 14:45:00
```

---

### **Vérifier sessions invalidées** :
```sql
SELECT * FROM sessions 
WHERE "userId" = 1 AND "userType" = 'apprenant';
```

**Attendu** :
```
(Aucune ligne) -- Toutes les sessions supprimées
```

---

## 📧 Mode Développement vs Production

### **Développement** (NODE_ENV=development) :
- ✅ Lien affiché dans la réponse API
- ✅ Lien affiché dans le modal
- ✅ Console serveur affiche le lien
- ✅ Pas besoin de service d'email

### **Production** (NODE_ENV=production) :
- ❌ Lien **non affiché** dans la réponse
- ✅ Email envoyé via service (SendGrid/Mailgun)
- ✅ Sécurité renforcée
- ✅ Expérience utilisateur professionnelle

---

## 🎨 Captures d'Écran du Flux

### **1. Page de connexion**
```
┌──────────────────────────────────────┐
│  Email                               │
│  ┌────────────────────────────────┐  │
│  │ user@example.com               │  │
│  └────────────────────────────────┘  │
│                                      │
│  Mot de passe                        │
│  ┌────────────────────────────────┐  │
│  │ ••••••••                       │  │
│  └────────────────────────────────┘  │
│                                      │
│  ☐ Se souvenir   🔗 Mot de passe    │
│                     oublié ?  ← CLIC│
└──────────────────────────────────────┘
```

---

### **2. Modal Mot de Passe Oublié**
```
┌──────────────────────────────────────┐
│  📧 Mot de passe oublié ?           │
│  Entrez votre email...              │
├──────────────────────────────────────┤
│  Adresse email                       │
│  ┌────────────────────────────────┐  │
│  │ user@example.com               │  │
│  └────────────────────────────────┘  │
│                                      │
│  Type de compte *                    │
│  ┌────────────────────────────────┐  │
│  │ 👤 Apprenant               ▼  │  │
│  └────────────────────────────────┘  │
│                                      │
│  💡 Lien valable 1h                 │
│                                      │
│  [Annuler]  [Envoyer le lien →]     │
└──────────────────────────────────────┘
```

---

### **3. Modal Succès (Dev)**
```
┌──────────────────────────────────────┐
│         ┌────────┐                   │
│         │   ✅   │                   │
│         └────────┘                   │
│                                      │
│   Email envoyé !                     │
│                                      │
│   Un email a été envoyé à           │
│   user@example.com                  │
│                                      │
│   🔧 Mode Développement              │
│   Cliquez sur le lien :              │
│   http://localhost:5173/reset-...   │
│                                      │
│   💡 Vérifiez votre boîte de        │
│      réception. Lien expire 1h.     │
│                                      │
│          [Compris]                   │
└──────────────────────────────────────┘
```

---

### **4. Page de Réinitialisation**
```
┌──────────────────────────────────────┐
│  🔒 Nouveau mot de passe            │
│  Pour user@example.com              │
├──────────────────────────────────────┤
│  Nouveau mot de passe                │
│  ┌────────────────────────────────┐  │
│  │ ••••••••••                     │  │
│  └────────────────────────────────┘  │
│                                      │
│  Confirmer le mot de passe           │
│  ┌────────────────────────────────┐  │
│  │ ••••••••••                     │  │
│  └────────────────────────────────┘  │
│                                      │
│  ✅ Conseils :                       │
│  • Au moins 6 caractères             │
│  • Majuscules et minuscules          │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Réinitialiser le mot de passe │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

### **5. Succès de Réinitialisation**
```
┌──────────────────────────────────────┐
│         ┌────────┐                   │
│         │   ✅   │                   │
│         └────────┘                   │
│                                      │
│   Mot de passe réinitialisé !       │
│                                      │
│   Votre mot de passe a été modifié  │
│   avec succès. Redirection vers     │
│   la page de connexion...           │
│                                      │
│   ⏳ Redirection en cours...         │
└──────────────────────────────────────┘
```

---

## 📝 Scénario Complet (Happy Path)

### **Jean Dupont (apprenant) a oublié son mot de passe** :

1. **09:00** - Jean va sur AuthCert
2. **09:01** - Clique "Mot de passe oublié ?"
3. **09:02** - Saisit `jean.dupont@example.com` + "Apprenant"
4. **09:03** - Clique "Envoyer"
5. **09:03** - Modal : "Email envoyé !" + Lien affiché
6. **09:04** - Jean copie/clique le lien
7. **09:04** - Page de réinitialisation s'ouvre
8. **09:05** - Jean saisit `SuperSecure2025!` deux fois
9. **09:05** - Clique "Réinitialiser"
10. **09:05** - Succès ! Redirection auto
11. **09:06** - Jean se connecte avec le nouveau MDP
12. **09:06** - ✅ **Connexion réussie !**

---

## 🐛 Tests d'Erreurs

### **Erreur 1 : Token expiré**

**Simulation** :
```sql
-- Modifier manuellement en DB
UPDATE password_resets 
SET "expiresAt" = NOW() - INTERVAL '2 hours' 
WHERE email = 'test@example.com' AND used = false;
```

**Attendu** :
```
❌ Lien invalide ou expiré
Ce lien de réinitialisation n'est plus valide.
[Retour à la connexion]
```

---

### **Erreur 2 : Token utilisé**

**Simulation** :
- Utilise un token
- Réutilise le même lien

**Attendu** :
```
❌ Ce lien a déjà été utilisé
```

---

### **Erreur 3 : Token invalide**

**Simulation** :
- Va sur `/reset-password?token=faketoken123`

**Attendu** :
```
❌ Lien invalide ou expiré
```

---

### **Erreur 4 : Mot de passe trop court**

**Simulation** :
- Saisit MDP : `12345`

**Attendu** :
```
❌ Le mot de passe doit contenir au moins 6 caractères
```

---

### **Erreur 5 : Mots de passe différents**

**Simulation** :
- MDP : `Password123`
- Confirmation : `Password456`

**Attendu** :
```
❌ Les mots de passe ne correspondent pas
```

---

## 🎯 Points de Contrôle

### **Backend** :

- [ ] Route `/api/auth/forgot-password` accessible
- [ ] Route `/api/auth/reset-password` accessible
- [ ] Route `/api/auth/verify-reset-token/:token` accessible
- [ ] Tokens générés avec 64 caractères
- [ ] Tokens expirés après 1h
- [ ] Anciens tokens invalidés automatiquement
- [ ] Sessions supprimées après reset
- [ ] Logs corrects dans la console

### **Frontend** :

- [ ] Modal s'ouvre au clic
- [ ] Formulaire validé côté client
- [ ] Appels API corrects
- [ ] Page de reset accessible
- [ ] Token vérifié au chargement
- [ ] Formulaire affiché si token valide
- [ ] Erreurs affichées si token invalide
- [ ] Redirection après succès

### **Base de Données** :

- [ ] Table `password_resets` créée
- [ ] Tokens insérés correctement
- [ ] Tokens marqués `used: true` après utilisation
- [ ] Sessions supprimées après reset
- [ ] Mots de passe mis à jour (hashés)

---

## 🔒 Vérifications de Sécurité

### **À vérifier** :

1. ✅ **Token non devinable** :
   - Utilise `crypto.randomBytes(32)` (sécurisé)
   - 64 caractères hex = 2^256 possibilités

2. ✅ **Expiration stricte** :
   - Vérifie `expiresAt` avant utilisation
   - Retourne erreur si expiré

3. ✅ **Usage unique** :
   - Vérifie `used` avant utilisation
   - Marque `used: true` après

4. ✅ **Invalidation sessions** :
   - Déconnecte tous les appareils
   - Force nouvelle connexion

5. ✅ **Anti-énumération** :
   - Même message si email existe ou non
   - Ne révèle aucune information

6. ✅ **Traçabilité** :
   - IP enregistrée
   - Timestamps complets
   - Logs serveur

---

## 📊 Données de Test

### **Utilisateurs de test** :

#### Apprenant :
```
Email: test.apprenant@example.com
Mot de passe: AncienMDP123
```

#### Établissement :
```
Email: test.etablissement@example.com
Mot de passe: AncienMDP123
```

### **Commandes SQL utiles** :

```sql
-- Voir tous les tokens
SELECT * FROM password_resets ORDER BY "createdAt" DESC;

-- Tokens actifs (non utilisés, non expirés)
SELECT * FROM password_resets 
WHERE used = false AND "expiresAt" > NOW();

-- Tokens d'un utilisateur
SELECT * FROM password_resets 
WHERE email = 'test@example.com';

-- Nettoyer tous les tokens
DELETE FROM password_resets;
```

---

## 🎉 Résultat Final

### **Ce qui est maintenant possible** :

✅ **Utilisateurs** peuvent récupérer leur mot de passe en 2 clics
✅ **Système sécurisé** avec tokens uniques et expiration
✅ **Traçabilité complète** (IP, timestamps)
✅ **UI/UX moderne** avec feedback clair
✅ **Mode dev** pratique (lien affiché)
✅ **Prêt pour prod** (ajouter service email)

---

## 🚀 Prochaines Étapes

### **Pour la production** :

1. **Intégrer service d'email** :
   ```bash
   npm install @sendgrid/mail
   ```

2. **Configurer SendGrid** :
   ```javascript
   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
   ```

3. **Créer template email** professionnel

4. **Ajouter rate limiting** :
   ```bash
   npm install express-rate-limit
   ```

5. **Monitorer les abus** (trop de demandes)

6. **CAPTCHA** si spam détecté

---

## 📞 Support

### **En cas de problème** :

#### "Je ne reçois pas l'email" :
- Vérifier spams
- Vérifier email saisi
- Vérifier type de compte
- En dev : Utiliser le lien affiché

#### "Le lien a expiré" :
- Demander un nouveau lien
- Les liens expirent après 1h

#### "Le lien ne fonctionne pas" :
- Vérifier que l'URL complète est copiée
- Vérifier que le token n'a pas été utilisé
- Demander un nouveau lien

---

**Système complet et prêt à l'emploi ! 🎊**

