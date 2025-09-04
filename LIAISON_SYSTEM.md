# 🔗 Système de Liaison Apprenant-Établissement

## 📋 Vue d'ensemble

Le système de liaison permet une relation **many-to-many** entre les apprenants et les établissements, avec gestion complète des demandes, approbations et statuts.

## 🏗️ Architecture

### Base de données

#### Nouveau modèle : `LiaisonApprenantEtablissement`
```prisma
model LiaisonApprenantEtablissement {
  id                Int      @id @default(autoincrement())
  apprenantId       Int
  etablissementId   Int
  statutLiaison     StatutLiaison @default(EN_ATTENTE)
  dateDemande       DateTime @default(now())
  dateApprobation   DateTime?
  dateRejet         DateTime?
  messageDemande    String?
  messageReponse    String?
  approuvePar       Int?     // ID de l'admin qui a approuvé
  
  // Relations
  apprenant         Apprenant @relation(fields: [apprenantId], references: [id_apprenant], onDelete: Cascade)
  etablissement     Etablissement @relation(fields: [etablissementId], references: [id_etablissement], onDelete: Cascade)
  
  @@unique([apprenantId, etablissementId])
  @@map("liaisons_apprenant_etablissement")
}
```

#### Nouvel enum : `StatutLiaison`
```prisma
enum StatutLiaison {
  EN_ATTENTE
  APPROUVE
  REJETE
  SUSPENDU
}
```

### Modifications des modèles existants

#### Apprenant
- ❌ Supprimé : `etablissementId` (relation 1-to-1)
- ✅ Ajouté : `liaisons` (relation 1-to-many)

#### Etablissement
- ❌ Supprimé : `apprenants` (relation 1-to-many)
- ✅ Ajouté : `liaisons` (relation 1-to-many)

## 🚀 API Endpoints

### Pour les Apprenants

#### 1. Créer une demande de liaison
```http
POST /api/liaison/demande
Authorization: Bearer <token>
Content-Type: application/json

{
  "etablissementId": 1,
  "messageDemande": "Message optionnel"
}
```

#### 2. Récupérer ses liaisons
```http
GET /api/apprenant/liaisons
Authorization: Bearer <token>
```

### Pour les Établissements

#### 1. Récupérer les demandes en attente
```http
GET /api/etablissement/:id/demandes
Authorization: Bearer <token>
```

#### 2. Approuver/Rejeter une demande
```http
PATCH /api/liaison/:id/statut
Authorization: Bearer <token>
Content-Type: application/json

{
  "statut": "APPROUVE", // ou "REJETE"
  "messageReponse": "Message optionnel"
}
```

#### 3. Récupérer les étudiants liés
```http
GET /api/etablissement/:id/etudiants
Authorization: Bearer <token>
```

#### 4. Récupérer les statistiques
```http
GET /api/etablissement/:id/stats-liaisons
Authorization: Bearer <token>
```

## 🎨 Interface Utilisateur

### Pour les Apprenants (`EstablishmentsScreen`)

#### Fonctionnalités
- ✅ **Statistiques en temps réel** : Établissements connectés, demandes en attente, taux d'approbation
- ✅ **Liste des liaisons** : Statut, dates, messages
- ✅ **Demande de liaison** : Formulaire avec message optionnel
- ✅ **Établissements disponibles** : Liste des établissements populaires

#### États des liaisons
- 🟡 **EN_ATTENTE** : Demande envoyée, en attente d'approbation
- 🟢 **APPROUVE** : Liaison active, peut recevoir des certificats
- 🔴 **REJETE** : Demande refusée
- 🟠 **SUSPENDU** : Liaison temporairement suspendue

### Pour les Établissements (`StudentsManagementScreen`)

#### Fonctionnalités
- ✅ **Gestion des demandes** : Approuver/Rejeter avec messages
- ✅ **Liste des étudiants liés** : Informations complètes, actions
- ✅ **Statistiques** : Total étudiants, demandes en attente, taux d'approbation
- ✅ **Recherche et filtrage** : Par nom, email, statut

#### Actions disponibles
- 📧 **Contacter** : Email direct à l'étudiant
- 👁️ **Voir détails** : Profil complet de l'étudiant
- ➕ **Créer certificat** : Pour les étudiants approuvés
- ✅ **Approuver** : Accepter la demande de liaison
- ❌ **Rejeter** : Refuser la demande avec message

## 📝 Inscription des Apprenants

### Nouveau processus (`SignupFormApprenant`)

#### Changements
- ✅ **Sélection multiple** : Checkboxes pour plusieurs établissements
- ✅ **Demandes automatiques** : Création automatique des demandes lors de l'inscription
- ✅ **Validation** : Au moins un établissement requis
- ✅ **Feedback visuel** : Affichage des établissements sélectionnés

#### Flux d'inscription
1. L'apprenant remplit le formulaire
2. Sélectionne un ou plusieurs établissements
3. Soumet l'inscription
4. Le système crée automatiquement les demandes de liaison
5. Les établissements reçoivent les demandes en attente

## 🔄 Flux de travail

### 1. Demande de liaison
```
Apprenant → Demande → Établissement → Décision → Notification
```

### 2. Inscription avec établissements
```
Apprenant → Inscription → Demandes automatiques → Établissements → Approbations
```

### 3. Gestion des certificats
```
Établissement → Étudiant approuvé → Création certificat → Notification apprenant
```

## 🛡️ Sécurité

### Authentification
- ✅ **JWT Tokens** : Toutes les routes protégées
- ✅ **Rôles** : Vérification des permissions (apprenant/établissement)
- ✅ **Propriété** : Les établissements ne peuvent gérer que leurs propres demandes

### Validation
- ✅ **Données** : Validation des champs requis
- ✅ **Unicité** : Une seule demande par paire apprenant-établissement
- ✅ **Statuts** : Gestion des transitions d'état

## 📊 Statistiques et Monitoring

### Métriques disponibles
- 📈 **Taux d'approbation** : Pourcentage de demandes approuvées
- ⏱️ **Temps de traitement** : Délai moyen d'approbation
- 📊 **Volume** : Nombre de demandes par période
- 🎯 **Performance** : Établissements les plus actifs

### Tableaux de bord
- 🏠 **Apprenant** : Vue d'ensemble de ses liaisons
- 🏢 **Établissement** : Gestion des étudiants et demandes
- 👑 **Admin** : Vue globale du système

## 🚀 Déploiement

### Migration de base de données
```bash
# Appliquer la migration
npx prisma migrate deploy

# Régénérer le client Prisma
npx prisma generate
```

### Variables d'environnement
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
```

## 🔧 Maintenance

### Nettoyage des données
- 🗑️ **Demandes anciennes** : Suppression automatique après 1 an
- 📊 **Archivage** : Conservation des statistiques
- 🔄 **Synchronisation** : Mise à jour des statuts

### Monitoring
- 📈 **Logs** : Traçabilité des actions
- 🚨 **Alertes** : Notifications des erreurs
- 📊 **Métriques** : Performance et utilisation

## 🎯 Prochaines étapes

### Fonctionnalités futures
- 📧 **Notifications email** : Alertes automatiques
- 📱 **Notifications push** : Pour les applications mobiles
- 🔔 **Système de messagerie** : Communication intégrée
- 📊 **Analytics avancées** : Tableaux de bord détaillés
- 🤖 **Automatisation** : Approbation automatique selon des critères

### Améliorations techniques
- ⚡ **Performance** : Optimisation des requêtes
- 🔒 **Sécurité** : Audit et conformité
- 🌐 **API** : Versioning et documentation
- 🧪 **Tests** : Couverture complète
