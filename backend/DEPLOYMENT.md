# 🚀 Guide de Déploiement Backend sur Railway

## 📋 Prérequis

- Compte GitHub avec votre projet
- Compte Railway (gratuit)
- Base de données PostgreSQL (Supabase recommandé)

## 🔧 Configuration Railway

### 1. Créer un compte Railway
- Aller sur [railway.app](https://railway.app)
- Se connecter avec GitHub

### 2. Créer un nouveau projet
- Cliquer sur "New Project"
- Sélectionner "Deploy from GitHub repo"
- Choisir votre repository `AuthCert`

### 3. Configurer le service
- Railway détectera automatiquement que c'est un projet Node.js
- Le dossier `backend/` sera utilisé comme racine

## 🌍 Variables d'environnement

Dans Railway, aller dans "Variables" et ajouter :

```bash
# Base de données
DATABASE_URL="postgresql://username:password@host:port/database"

# JWT
JWT_SECRET="votre_secret_jwt_tres_long_et_complexe"
JWT_EXPIRES_IN="24h"

# Serveur
NODE_ENV="production"
PORT="5000"

# CORS (URL de votre frontend)
FRONTEND_URL="https://votre-app.vercel.app"
```

## 📁 Structure des fichiers

```
backend/
├── server.js          # Serveur principal
├── package.json       # Dépendances
├── Procfile          # Configuration Railway
├── railway.json      # Configuration avancée
├── config/           # Configuration JWT
├── utils/            # Utilitaires (upload)
└── prisma/           # Schéma Prisma
```

## 🚀 Déploiement automatique

1. **Push sur GitHub** : Le déploiement se fait automatiquement
2. **Build** : Railway installe les dépendances avec `npm install`
3. **Démarrage** : L'application démarre avec `npm start`
4. **Health Check** : Railway vérifie `/api/health`

## 🔍 Vérification du déploiement

### 1. Logs Railway
- Aller dans "Deployments"
- Vérifier que le build est réussi
- Consulter les logs pour détecter les erreurs

### 2. Test de l'API
```bash
# Test de santé
curl https://votre-app.railway.app/api/health

# Test de la base de données
curl https://votre-app.railway.app/api/test-db
```

### 3. Vérifier les variables
- Dans Railway, aller dans "Variables"
- Vérifier que `DATABASE_URL` est correcte
- Vérifier que `JWT_SECRET` est défini

## 🐛 Résolution des problèmes

### Erreur de build
```bash
# Vérifier package.json
npm install --production

# Vérifier les dépendances
npm ls
```

### Erreur de base de données
```bash
# Vérifier DATABASE_URL
echo $DATABASE_URL

# Tester la connexion
npx prisma db pull
```

### Erreur de port
```bash
# Railway définit automatiquement PORT
# Utiliser process.env.PORT dans le code
```

## 🔄 Mise à jour

1. **Modifier le code** localement
2. **Commit et push** sur GitHub
3. **Railway redéploie** automatiquement
4. **Vérifier** les logs de déploiement

## 📊 Monitoring

- **Logs** : Disponibles en temps réel dans Railway
- **Métriques** : CPU, mémoire, réseau
- **Health checks** : Vérification automatique de l'API

## 🔒 Sécurité

- **HTTPS** : Automatique avec Railway
- **Variables** : Stockées de manière sécurisée
- **CORS** : Configuré pour votre domaine
- **JWT** : Secret stocké dans les variables d'environnement

## 💰 Coûts

- **Gratuit** : 500h/mois
- **Payant** : $5/mois après
- **Base de données** : Incluse dans l'abonnement

## 🎯 Prochaines étapes

1. **Déployer** sur Railway
2. **Tester** l'API déployée
3. **Mettre à jour** les URLs frontend
4. **Configurer** Supabase pour la production
