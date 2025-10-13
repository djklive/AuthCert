# 🐛 Guide de Debugging - Notifications DEMANDE_LIAISON_APPRENANT

## ❓ Problème Rapporté
La notification `DEMANDE_LIAISON_APPRENANT` n'apparaît pas après avoir fait une demande de liaison.

## ✅ Corrections Apportées

### 1. **Ajout de la notification dans `/api/liaison/demande`**
**Fichier** : `backend/server.js` (ligne 5235-5245)

**Avant** :
```javascript
console.log(`✅ Demande de liaison créée: ${liaison.id}`);

res.status(201).json({ ... });
// ❌ Aucune notification créée !
```

**Après** :
```javascript
console.log(`✅ Demande de liaison créée: ${liaison.id}`);

// ✅ Créer une notification pour l'établissement
await createNotification({
  userId: parseInt(etablissementId),
  userType: 'etablissement',
  type: 'DEMANDE_LIAISON_APPRENANT',
  titre: 'Nouvelle demande de liaison',
  message: `${liaison.apprenant.prenom} ${liaison.apprenant.nom} souhaite se lier à votre établissement`,
  important: true,
  lienAction: '/dashboard?userType=establishment',
  metadonnees: { liaisonId: liaison.id, apprenantId: userId }
});

res.status(201).json({ ... });
```

### 2. **Correction du type Json dans Prisma**
**Problème** : `JSON.stringify()` était utilisé alors que Prisma `Json` type accepte directement un objet

**Avant** :
```javascript
metadonnees: metadonnees ? JSON.stringify(metadonnees) : null
// ❌ Double stringification !
```

**Après** :
```javascript
metadonnees: metadonnees || null
// ✅ Prisma gère automatiquement la conversion JSON
```

### 3. **Ajout de logs de debug**
```javascript
console.error('❌ Erreur création notification:', error);
console.error('📋 Détails de la notification échouée:', { userId, userType, type, titre });
// ✅ Permet de voir les erreurs de création de notification
```

---

## 🧪 Tests à Effectuer

### Test 1 : Demande de liaison depuis l'inscription
1. **Créer un nouveau compte apprenant** :
   - Remplis le formulaire d'inscription
   - Sélectionne un établissement actif
   - Soumets le formulaire

2. **Vérifier les logs backend** :
   ```
   ✅ Apprenant créé: test@example.com avec 1 demandes de liaison
   📬 Notification créée pour etablissement 3: Nouvelle demande de liaison
   ```

3. **Connecte-toi en tant qu'établissement** :
   - Va sur **Notifications**
   - ✅ Vérifie : Tu vois la notification "Nouvelle demande de liaison"

### Test 2 : Demande de liaison manuelle (apprenant déjà inscrit)
1. **Connecte-toi en tant qu'apprenant**
2. **Va sur page "Établissements"** (`EstablishmentsScreen.tsx`)
3. **Clique sur "Se connecter"** sur un établissement
4. **Ajoute un message** (optionnel)
5. **Envoie la demande**

6. **Vérifier les logs backend** :
   ```
   🔗 Demande de liaison: Apprenant 5 -> Établissement 3
   ✅ Demande de liaison créée: 12
   📬 Notification créée pour etablissement 3: Nouvelle demande de liaison
   ```

7. **Déconnecte-toi**

8. **Connecte-toi en tant qu'établissement** (celui demandé)
   - Va sur **Notifications**
   - ✅ Vérifie : Tu vois la notification "Nouvelle demande de liaison"
   - ✅ Vérifie : Le badge dans Navigation affiche +1

---

## 🔍 Debugging Si Ça Ne Marche Pas

### Étape 1 : Vérifier les logs backend

Après avoir fait une demande de liaison, tu dois voir dans le terminal backend :

```
🔗 Demande de liaison: Apprenant 5 -> Établissement 3
✅ Demande de liaison créée: 12
📬 Notification créée pour etablissement 3: Nouvelle demande de liaison
```

**Si tu ne vois PAS le log `📬 Notification créée`** :
- Il y a une erreur dans `createNotification()`
- Regarde s'il y a un log `❌ Erreur création notification`

### Étape 2 : Vérifier la base de données

Ouvre un client PostgreSQL et exécute :

```sql
-- Voir toutes les notifications créées
SELECT * FROM notifications ORDER BY "createdAt" DESC LIMIT 10;

-- Voir spécifiquement les notifications DEMANDE_LIAISON_APPRENANT
SELECT * FROM notifications 
WHERE type = 'DEMANDE_LIAISON_APPRENANT'
ORDER BY "createdAt" DESC;

-- Compter par type
SELECT type, COUNT(*) as count 
FROM notifications 
GROUP BY type;
```

**Si la table est vide** :
- La fonction `createNotification()` échoue silencieusement
- Vérifie les logs d'erreur dans le terminal

### Étape 3 : Tester manuellement la création

Ajoute ce code temporaire dans `server.js` après la ligne 3862 :

```javascript
// ⚠️ ROUTE DE TEST - À SUPPRIMER APRÈS DEBUG
app.post('/api/test-notification', authenticateToken, async (req, res) => {
  try {
    const notification = await createNotification({
      userId: req.user.id,
      userType: req.user.role === 'student' ? 'apprenant' : 'etablissement',
      type: 'DEMANDE_LIAISON_APPRENANT',
      titre: 'TEST - Nouvelle demande de liaison',
      message: 'Ceci est un test de notification',
      important: true,
      lienAction: '/dashboard',
      metadonnees: { test: true }
    });

    res.json({
      success: true,
      message: 'Notification de test créée',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

Puis teste avec Postman ou curl :
```bash
curl -X POST http://localhost:5000/api/test-notification \
  -H "Authorization: Bearer TON_TOKEN" \
  -H "Content-Type: application/json"
```

### Étape 4 : Vérifier la migration Prisma

Assure-toi que la migration a bien été appliquée :

```bash
cd backend
npx prisma migrate status
```

**Si des migrations sont en attente** :
```bash
npx prisma migrate deploy
npx prisma generate
```

### Étape 5 : Vérifier le enum TypeNotification

Vérifie dans `schema.prisma` que `DEMANDE_LIAISON_APPRENANT` existe bien :

```prisma
enum TypeNotification {
  NOUVEAU_CERTIFICAT
  VERIFICATION_CERTIFICAT
  DEMANDE_LIAISON_APPRENANT  // ✅ Doit être présent
  ...
}
```

---

## 🔧 Solutions Possibles

### Solution 1 : Erreur silencieuse
**Problème** : La fonction `createNotification()` échoue mais ne fait pas échouer la demande de liaison

**Solution** :
- Regarde les logs backend pour `❌ Erreur création notification`
- Regarde les détails de l'erreur

### Solution 2 : Type de notification incorrect
**Problème** : Le type `DEMANDE_LIAISON_APPRENANT` n'existe pas dans l'enum

**Solution** :
- Vérifie `schema.prisma` ligne 427-442
- Re-exécute `npx prisma generate`

### Solution 3 : Problème de userId ou userType
**Problème** : L'ID ou le type ne correspond pas

**Solution** :
- Vérifie que `etablissement.id_etablissement` est bien un nombre
- Vérifie que `userType: 'etablissement'` est correct (pas 'establishment')

### Solution 4 : Migration non appliquée
**Problème** : La table `notifications` n'existe pas

**Solution** :
```bash
cd backend
npx prisma migrate dev --name add-notifications-fix
npx prisma generate
```

---

## 📋 Checklist de Vérification

Avant de tester à nouveau :

- [ ] ✅ Migration Prisma appliquée (`npx prisma migrate status`)
- [ ] ✅ Client Prisma généré (`npx prisma generate`)
- [ ] ✅ Backend redémarré (après modifications)
- [ ] ✅ Enum `TypeNotification` contient `DEMANDE_LIAISON_APPRENANT`
- [ ] ✅ Fonction `createNotification()` modifiée (ligne 3830-3862)
- [ ] ✅ Notification ajoutée dans `/api/liaison/demande` (ligne 5235-5245)
- [ ] ✅ Notification ajoutée dans `/api/register/apprenant` (ligne 657-667)

---

## 🎯 Test Final Simplifié

### Étape par étape :

1. **Démarrer le backend** :
   ```bash
   cd backend
   npm start
   ```

2. **Vérifier dans les logs au démarrage** :
   ```
   🚀 Serveur démarré sur le port 5000
   ✅ Connexion à la base de données réussie
   ```

3. **En tant qu'apprenant** :
   - Va sur **Établissements**
   - Clique sur "Se connecter" sur un établissement
   - Remplis le message (optionnel)
   - Clique "Envoyer"

4. **Dans le terminal backend, tu DOIS voir** :
   ```
   🔗 Demande de liaison: Apprenant X -> Établissement Y
   ✅ Demande de liaison créée: Z
   📬 Notification créée pour etablissement Y: Nouvelle demande de liaison
   ```

5. **Si tu ne vois PAS le log `📬`** :
   - Il y a une erreur
   - Regarde s'il y a `❌ Erreur création notification`
   - Regarde les détails de l'erreur

6. **Connecte-toi en tant qu'établissement** :
   - Va sur **Notifications**
   - Actualise la page (F5)
   - ✅ Tu dois voir la notification

---

## 💡 Note Importante

### Deux endroits créent cette notification :

1. **Lors de l'inscription** (`/api/register/apprenant` - ligne 657-667)
   - Quand un nouvel apprenant s'inscrit et sélectionne des établissements
   - Créé automatiquement pour chaque établissement sélectionné

2. **Demande manuelle** (`/api/liaison/demande` - ligne 5235-5245) **[NOUVEAU]**
   - Quand un apprenant déjà inscrit demande une liaison
   - Via la page "Établissements"

**Les deux devraient maintenant créer la notification !**

---

## 🚀 Prochaines Actions

1. **Redémarre le backend** :
   ```bash
   taskkill /f /im node.exe
   cd backend
   npm start
   ```

2. **Teste à nouveau** en suivant le "Test Final Simplifié"

3. **Regarde attentivement les logs backend**

4. **Si ça ne marche toujours pas**, envoie-moi :
   - Les logs du backend (complets)
   - Le message d'erreur exact (s'il y en a)
   - La réponse de l'API dans le Network du navigateur

---

## ✅ Résumé des Corrections

| Élément | Avant | Après | Statut |
|---------|-------|-------|--------|
| `/api/liaison/demande` | ❌ Pas de notification | ✅ Notification créée | Corrigé |
| `createNotification()` | ❌ `JSON.stringify()` | ✅ Objet direct | Corrigé |
| Logs de debug | ⚠️ Basiques | ✅ Détaillés | Amélioré |

**Tout devrait maintenant fonctionner ! Teste et dis-moi si ça marche ! 🎊**

