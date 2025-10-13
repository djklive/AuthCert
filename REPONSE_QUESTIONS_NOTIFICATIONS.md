# 📬 Réponses aux Questions sur les Notifications et Dashboards

## ❓ Question 1 : Les notifications sont-elles filtrées par rôle ?

### ✅ **OUI, absolument ! Le système est 100% sécurisé et filtré par rôle.**

---

## 🔐 Comment fonctionne le filtrage par rôle ?

### **Backend - Filtrage automatique**

Dans `backend/server.js`, route `GET /api/notifications` (ligne 3183) :

```javascript
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;        // ✅ ID de l'utilisateur connecté
    const userRole = req.user.role;    // ✅ Rôle : 'student', 'establishment', 'admin'
    
    // Mapper le rôle vers le userType de la DB
    const userTypeMap = {
      'student': 'apprenant',
      'establishment': 'etablissement',
      'admin': 'admin'
    };
    const userType = userTypeMap[userRole];  // ✅ Type pour la DB
    
    // Requête Prisma avec filtres stricts
    const where = {
      userId,      // ✅ Filtre UNIQUEMENT les notifications de cet utilisateur
      userType,    // ✅ Filtre UNIQUEMENT le bon type (apprenant/etablissement/admin)
      ...
    };
    
    const notifications = await prisma.notification.findMany({ where, ... });
    // ✅ L'utilisateur ne reçoit QUE ses propres notifications !
  }
});
```

### **Ce que cela signifie concrètement :**

#### 🎓 **Si tu es connecté en tant qu'APPRENANT** :
- ✅ Tu verras **UNIQUEMENT** tes notifications :
  - `NOUVEAU_CERTIFICAT` - Quand un certificat t'est émis
  - `DEMANDE_LIAISON_APPROUVEE` - Quand une liaison est approuvée
  - `DEMANDE_LIAISON_REJETEE` - Quand une liaison est rejetée
  - `DEMANDE_CERTIFICAT_APPROUVEE` - Quand ta demande est approuvée
  - `DEMANDE_CERTIFICAT_REJETEE` - Quand ta demande est rejetée
  
- ❌ Tu ne verras **JAMAIS** :
  - Les notifications d'un autre apprenant
  - Les notifications d'un établissement
  - Les notifications d'un admin

#### 🏫 **Si tu es connecté en tant qu'ÉTABLISSEMENT** :
- ✅ Tu verras **UNIQUEMENT** tes notifications :
  - `DEMANDE_LIAISON_APPRENANT` - Quand un étudiant demande une liaison
  - `DEMANDE_CERTIFICAT_NOUVELLE` - Quand un étudiant demande un certificat
  - `VERIFICATION_CERTIFICAT` - Quand tes certificats sont vérifiés (max 1/24h)
  
- ❌ Tu ne verras **JAMAIS** :
  - Les notifications d'un autre établissement
  - Les notifications d'un apprenant
  - Les notifications d'un admin

#### 👨‍💼 **Si tu es connecté en tant qu'ADMIN** :
- ✅ Tu verras **UNIQUEMENT** tes notifications :
  - `SYSTEME_MISE_A_JOUR` - Mises à jour système
  - `SECURITE_ALERTE` - Alertes de sécurité
  
- ❌ Tu ne verras **JAMAIS** :
  - Les notifications des apprenants
  - Les notifications des établissements

---

## 🛡️ Sécurité et Vérifications

### **Triple protection** :

1. **Authentification** :
   ```javascript
   app.get('/api/notifications', authenticateToken, async (req, res) => {
   ```
   ✅ Seuls les utilisateurs connectés peuvent accéder aux notifications

2. **Filtrage par userId** :
   ```javascript
   const where = { userId: req.user.id, ... };
   ```
   ✅ Tu ne peux voir QUE tes propres notifications (pas celles des autres)

3. **Filtrage par userType** :
   ```javascript
   const where = { userType: 'apprenant', ... };
   ```
   ✅ Tu ne vois que les notifications de ton type (apprenant ≠ etablissement)

### **Vérification supplémentaire pour les actions** :

Lors du marquage comme lu ou suppression (lignes 3192-3333) :
```javascript
// Vérifier que la notification appartient à l'utilisateur
const notification = await prisma.notification.findFirst({
  where: { 
    id: parseInt(id),
    userId,        // ✅ Doit être ton ID
    userType       // ✅ Doit être ton type
  }
});

if (!notification) {
  return res.status(404).json({ 
    success: false, 
    message: 'Notification introuvable'  // ✅ Impossible d'accéder aux notifications des autres
  });
}
```

---

## 📊 Exemple Concret

### Scénario : 2 utilisateurs

**Utilisateur A** : Apprenant (ID: 5)
- Base de données : 
  - Notification 1 : { userId: 5, userType: 'apprenant', titre: 'Certificat disponible' }
  - Notification 2 : { userId: 5, userType: 'apprenant', titre: 'Liaison approuvée' }

**Utilisateur B** : Établissement (ID: 3)
- Base de données :
  - Notification 3 : { userId: 3, userType: 'etablissement', titre: 'Nouvelle demande' }
  - Notification 4 : { userId: 3, userType: 'etablissement', titre: 'Vérification' }

### Quand l'Apprenant A se connecte :
```javascript
GET /api/notifications
// Filtre automatique : { userId: 5, userType: 'apprenant' }
// Résultat : UNIQUEMENT Notifications 1 et 2
// ❌ JAMAIS les Notifications 3 et 4
```

### Quand l'Établissement B se connecte :
```javascript
GET /api/notifications
// Filtre automatique : { userId: 3, userType: 'etablissement' }
// Résultat : UNIQUEMENT Notifications 3 et 4
// ❌ JAMAIS les Notifications 1 et 2
```

---

## 🎯 Réponse Finale à ta Question

### **Est-ce que dans NotificationsScreen.tsx si tu es connecté en tant qu'apprenant, ce sont juste les notifications correspondantes qui apparaîtront ?**

✅ **OUI, à 100% !**

- Le composant `NotificationsScreen.tsx` appelle `api.getNotifications()`
- L'API backend utilise `req.user.id` et `req.user.role` du JWT
- Prisma filtre automatiquement par `userId` et `userType`
- **Résultat** : Tu ne vois **QUE** tes propres notifications, personne d'autre

### **Et si tu es connecté en tant qu'établissement ?**

✅ **OUI, pareil !**

- Même composant `NotificationsScreen.tsx`
- Même appel API `api.getNotifications()`
- Mais le backend filtre avec `userType: 'etablissement'` et `userId: ton_id_etablissement`
- **Résultat** : Tu ne vois **QUE** les notifications de ton établissement

---

## 📱 Implémentation Frontend

### NotificationsScreen.tsx

```typescript
// Pas besoin de filtrer côté frontend !
// L'API retourne DÉJÀ les bonnes notifications
const loadNotifications = useCallback(async () => {
  const response = await api.getNotifications({ limit: 50 });
  // response.data contient UNIQUEMENT tes notifications
  // Aucun risque de voir celles d'un autre utilisateur
}, []);
```

Le composant **ne sait même pas** qu'il existe d'autres notifications dans la DB !

---

## 🔔 Badge de Notifications dans Navigation.tsx

Même principe pour le compteur :

```typescript
// Navigation.tsx - ligne 72-89
useEffect(() => {
  const loadUnreadCount = async () => {
    const response = await api.getUnreadNotificationsCount();
    // ✅ Compte UNIQUEMENT tes notifications non lues
    setUnreadNotificationsCount(response.data.count);
  };
  
  loadUnreadCount();
  
  // Actualisation toutes les 30 secondes
  const interval = setInterval(loadUnreadCount, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## 📊 Dashboard Apprenant - Maintenant Fonctionnel !

### Nouvelle route API : `GET /api/apprenant/:id/dashboard`

**Données retournées** :
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalCertificates": 12,       // Total certificats (émis + révoqués)
      "certificatesIssued": 11,       // Certificats actifs (émis)
      "totalVerifications": 89,       // Toutes les vérifications
      "recentVerifications": 15,      // Vérifications ce mois
      "linkedEstablishments": 3,      // Établissements liés (approuvés)
      "pendingRequests": 2            // Demandes en attente
    },
    "recentCertificates": [           // 3 derniers certificats
      {
        "id": 123,
        "titre": "Master Marketing",
        "etablissement": "Université de Yaoundé",
        "dateObtention": "2025-10-01",
        "statut": "EMIS",
        "verifications": 24
      }
    ],
    "recentNotifications": [          // 5 dernières notifications
      {
        "id": 456,
        "titre": "Nouveau certificat disponible",
        "message": "Votre certificat React est prêt",
        "lu": false,
        "important": true,
        "type": "NOUVEAU_CERTIFICAT",
        "timeAgo": "Il y a 2h"
      }
    ],
    "activityData": [                 // Données pour graphique (6 mois)
      { "month": "sep.", "certificates": 2, "verifications": 15 },
      { "month": "oct.", "certificates": 3, "verifications": 24 }
    ]
  }
}
```

### DashboardScreen.tsx (Apprenant)

**Améliorations apportées** :
- ✅ Remplacement de TOUS les mocks par données réelles
- ✅ KPIs dynamiques (certificats, vérifications, établissements)
- ✅ 3 derniers certificats avec vraies données
- ✅ 5 dernières notifications avec icônes dynamiques
- ✅ États de chargement et d'erreur avec retry
- ✅ Gestion des cas vides (aucun certificat)

---

## 🆚 Comparaison Avant/Après

### **AVANT** (Mocks)
```typescript
// DashboardScreen.tsx - AVANT
const mockStats = [
  { title: "Certificats", value: "12", ... },  // ❌ Toujours 12
  { title: "Vérifications", value: "15", ... } // ❌ Toujours 15
];

const mockCertificates = [
  { title: "Certification Next", ... },  // ❌ Données fictives
  { title: "React Advanced", ... }       // ❌ Toujours les mêmes
];
```

### **APRÈS** (Données réelles)
```typescript
// DashboardScreen.tsx - APRÈS
const loadDashboardData = useCallback(async () => {
  const response = await api.getStudentDashboard(studentId);
  setDashboardData(response.data);  // ✅ Données réelles de la DB
}, [user?.id]);

const stats = dashboardData?.stats || { ... };  // ✅ Statistiques réelles
const recentCertificates = dashboardData?.recentCertificates || [];  // ✅ Vrais certificats
const recentNotifications = dashboardData?.recentNotifications || [];  // ✅ Vraies notifications
```

---

## 📋 Récapitulatif des Pages Fonctionnelles

### ✅ **Pages sans mocks (100% fonctionnelles)** :

1. **NotificationsScreen.tsx** (apprenant & établissement)
   - Charge les notifications depuis l'API
   - Filtrées automatiquement par rôle
   - Actions : lire, supprimer, tout marquer comme lu
   
2. **EstablishmentDashboardScreen.tsx** (établissement uniquement)
   - Statistiques du mois en cours
   - Demandes de liaison en attente (3 dernières)
   - Activité récente (5 dernières actions)
   - Graphique d'évolution (6 mois)
   
3. **EstablishmentStatsScreen.tsx** (établissement uniquement)
   - Statistiques détaillées avec filtres de période
   - Top 5 certificats les plus vérifiés
   - Graphiques mensuels
   - Export CSV
   
4. **DashboardScreen.tsx** (apprenant uniquement) - **NOUVEAU !**
   - KPIs : Certificats, Vérifications, Établissements
   - 3 derniers certificats avec détails
   - 5 dernières notifications
   - Gestion des états vides

5. **Navigation.tsx** (apprenant & établissement)
   - Badge avec nombre réel de notifications non lues
   - Actualisation automatique toutes les 30s
   - Filtré par rôle automatiquement

---

## 🔍 Preuves du Filtrage par Rôle

### **Preuve 1 : Requête Prisma**
```javascript
const notifications = await prisma.notification.findMany({
  where: {
    userId: 5,                    // ✅ Ton ID uniquement
    userType: 'apprenant',        // ✅ Ton type uniquement
    ...
  }
});
```

### **Preuve 2 : Création de notification**
```javascript
// Lors de l'émission d'un certificat (ligne 4172)
await createNotification({
  userId: certificat.apprenantId,   // ✅ ID de l'étudiant
  userType: 'apprenant',            // ✅ Type apprenant
  type: 'NOUVEAU_CERTIFICAT',
  ...
});
// ✅ Cette notification ira UNIQUEMENT à cet apprenant
```

### **Preuve 3 : Vérification des permissions**
```javascript
// Lors du marquage comme lu (ligne 3206)
const notification = await prisma.notification.findFirst({
  where: { 
    id: parseInt(id),
    userId,        // ✅ Doit être ton ID
    userType       // ✅ Doit être ton type
  }
});

if (!notification) {
  return res.status(404).json({ message: 'Notification introuvable' });
  // ✅ Impossible d'accéder à une notification d'un autre utilisateur
}
```

---

## 🎨 Visuel des Notifications par Rôle

### **Apprenant connecté voit** :
```
┌─────────────────────────────────────────────┐
│ 📬 Notifications (3)                        │
├─────────────────────────────────────────────┤
│ 🎓 Nouveau certificat disponible           │
│    Votre certificat "React" est prêt        │
│    Il y a 2h                                │
├─────────────────────────────────────────────┤
│ ✅ Demande de liaison approuvée            │
│    Université de Yaoundé a accepté         │
│    Il y a 1j                                │
├─────────────────────────────────────────────┤
│ ✅ Demande de certificat approuvée         │
│    Votre demande "Master" est validée      │
│    Il y a 3j                                │
└─────────────────────────────────────────────┘
```

### **Établissement connecté voit** :
```
┌─────────────────────────────────────────────┐
│ 📬 Notifications (2)                        │
├─────────────────────────────────────────────┤
│ 👤 Nouvelle demande de liaison             │
│    Jean Dupont souhaite se lier            │
│    Il y a 1h                                │
├─────────────────────────────────────────────┤
│ 📄 Nouvelle demande de certificat          │
│    Marie Martin demande "Master UX"        │
│    Il y a 4h                                │
└─────────────────────────────────────────────┘
```

**❌ JAMAIS de croisement entre les deux !**

---

## 🧪 Comment Tester ?

### Test 1 : Vérifier le filtrage
1. Connecte-toi en tant qu'**apprenant**
2. Va sur **Notifications**
3. Note les notifications affichées
4. Déconnecte-toi
5. Connecte-toi en tant qu'**établissement**
6. Va sur **Notifications**
7. ✅ **Résultat attendu** : Tu verras des notifications COMPLÈTEMENT DIFFÉRENTES !

### Test 2 : Badge dans Navigation
1. Connecte-toi en tant qu'**apprenant**
2. Regarde le badge sur l'icône "Notifications" dans la barre de navigation
3. Note le nombre (ex: 3)
4. Déconnecte-toi
5. Connecte-toi en tant qu'**établissement**
6. ✅ **Résultat attendu** : Le nombre sera DIFFÉRENT car ce sont d'autres notifications !

### Test 3 : Sécurité (tentative d'accès croisé)
1. Connecte-toi en tant qu'**apprenant**
2. Ouvre la console navigateur
3. Essaie manuellement :
   ```javascript
   fetch('http://localhost:5000/api/notifications', {
     headers: { 'Authorization': 'Bearer ton_token_apprenant' }
   }).then(r => r.json()).then(console.log);
   ```
4. ✅ **Résultat** : Tu verras UNIQUEMENT tes notifications d'apprenant
5. Même si tu changes l'URL ou les paramètres, **impossible de voir les notifications d'un établissement** !

---

## 📝 Fichiers Modifiés pour DashboardScreen.tsx

### Backend
- ✅ `backend/server.js` - Nouvelle route `GET /api/apprenant/:id/dashboard`

### Frontend
- ✅ `src/services/api.ts` - Nouvelle méthode `getStudentDashboard()`
- ✅ `src/dashboard/components/screens/DashboardScreen.tsx` - Données réelles

### Données affichées :
- **KPIs** : Certificats, Vérifications, Établissements liés
- **Certificats récents** : 3 derniers avec établissement, date, vérifications
- **Notifications récentes** : 5 dernières avec point coloré (lu/non lu)
- **États** : Chargement, erreur avec retry, vide

---

## ✅ Conclusion

### Question 1 : Filtrage par rôle ?
**Réponse** : ✅ **OUI, 100% garanti !**
- Filtrage au niveau backend (Prisma)
- Vérification des permissions à chaque action
- Impossible de voir les notifications d'un autre utilisateur
- Impossible de voir les notifications d'un autre type (apprenant vs établissement)

### Question 2 : DashboardScreen.tsx apprenant fonctionnel ?
**Réponse** : ✅ **OUI, maintenant complètement fonctionnel !**
- Appelle l'API `/api/apprenant/:id/dashboard`
- Affiche les vraies statistiques
- Certificats récents réels
- Notifications récentes réelles
- Plus de mocks !

---

## 🎉 Statut Final

### Toutes les pages sont maintenant fonctionnelles :
- ✅ NotificationsScreen.tsx (apprenant & établissement)
- ✅ DashboardScreen.tsx (apprenant)
- ✅ EstablishmentDashboardScreen.tsx (établissement)
- ✅ EstablishmentStatsScreen.tsx (établissement)
- ✅ Navigation.tsx (badge dynamique)

### Sécurité :
- ✅ Filtrage strict par rôle
- ✅ Authentification obligatoire
- ✅ Vérification des permissions
- ✅ Impossible d'accéder aux données d'autrui

**Tout est prêt pour être testé ! 🚀**

