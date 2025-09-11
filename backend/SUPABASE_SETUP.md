# Configuration Supabase Storage

## 🚀 Étapes pour configurer Supabase

### 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un compte ou connectez-vous
3. Cliquez sur "New Project"
4. Choisissez votre organisation
5. Remplissez les informations :
   - **Name** : `authcert-storage`
   - **Database Password** : Choisissez un mot de passe fort
   - **Region** : Choisissez la région la plus proche

### 2. Récupérer les clés d'API

1. Dans votre projet Supabase, allez dans **Settings** > **API**
2. Copiez les valeurs suivantes :
   - **Project URL** (ex: `https://abcdefghijklmnop.supabase.co`)
   - **anon public** key (ex: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 3. Configurer les variables d'environnement

Créez un fichier `.env` dans le dossier `backend/` avec le contenu suivant :

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/authcert"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Supabase Configuration
SUPABASE_URL="https://votre-projet.supabase.co"
SUPABASE_ANON_KEY="votre-clé-anon-supabase"

# Blockchain Configuration
AMOY_RPC_URL="https://polygon-amoy.g.alchemy.com/v2/41EXpeJsOFHfwzaQHCvmJ"
PRIVATE_KEY="votre-clé-privée-ici"

# Server
PORT=5000
```

### 4. Tester la configuration

```bash
cd backend
node scripts/testSupabaseCompatibility.js
```

## 🔧 Configuration du Storage

### Créer un bucket

1. Dans Supabase, allez dans **Storage**
2. Cliquez sur **New bucket**
3. Nom : `authcert-files`
4. **Public** : ❌ (décoché - bucket privé)
5. Cliquez sur **Create bucket**

### Configurer les politiques RLS (Row Level Security)

1. Allez dans **Storage** > **Policies**
2. Créez une politique pour le bucket `authcert-files` :

```sql
-- Politique pour permettre l'upload aux utilisateurs authentifiés
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'authcert-files' AND auth.role() = 'authenticated');

-- Politique pour permettre la lecture aux utilisateurs authentifiés
CREATE POLICY "Allow authenticated reads" ON storage.objects
FOR SELECT USING (bucket_id = 'authcert-files' AND auth.role() = 'authenticated');
```

## 🧪 Test de fonctionnement

Une fois configuré, testez avec :

```bash
cd backend
node scripts/testSupabaseCompatibility.js
```

Vous devriez voir :
```
🧪 Test de compatibilité Supabase Storage...

0️⃣ Vérification des variables d'environnement...
✅ Variables d'environnement configurées
   SUPABASE_URL: https://votre-projet.supabase.co
   SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

1️⃣ Test d'initialisation du bucket...
✅ Bucket initialisé avec succès

2️⃣ Test d'upload de fichier...
✅ Upload réussi: https://votre-projet.supabase.co/storage/v1/object/public/authcert-files/test/test-compatibility.txt

3️⃣ Test d'URL signée...
✅ URL signée générée: https://votre-projet.supabase.co/storage/v1/object/sign/authcert-files/test/test-compatibility.txt?token=...

4️⃣ Test de suppression...
✅ Fichier supprimé avec succès

🎉 Tous les tests de compatibilité sont passés !
```

## 🚨 Dépannage

### Erreur "fetch failed"
- Vérifiez que `SUPABASE_URL` est correct
- Vérifiez votre connexion internet

### Erreur "Invalid API key"
- Vérifiez que `SUPABASE_ANON_KEY` est correct
- Assurez-vous d'utiliser la clé "anon public" et non "service_role"

### Erreur "Bucket not found"
- Le bucket sera créé automatiquement par le script
- Vérifiez que les politiques RLS sont configurées

## 📊 Monitoring

Vous pouvez surveiller l'utilisation du storage dans :
- **Storage** > **Usage** : Voir l'espace utilisé
- **Logs** : Voir les requêtes de storage
- **API** > **Usage** : Voir les appels API


