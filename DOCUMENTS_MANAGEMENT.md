# 📋 Gestion des Documents d'Inscription Établissement

## 🎯 **Situation Actuelle**

Pour l'instant, les documents sont **collectés mais non traités** lors de l'inscription établissement. L'inscription fonctionne avec les données textuelles uniquement.

## 🚀 **Solutions Recommandées**

### **Option 1 : Stockage Local Temporaire (Recommandé pour commencer)**

```typescript
// Dans SignupFormEtablissement.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  // Stocker les documents localement (localStorage/sessionStorage)
  const documentsData = {
    rccm: documents.rccmDocument?.name || null,
    autorisation: documents.autorisation?.name || null,
    pieceIdentite: documents.pieceIdentite?.name || null,
    logo: documents.logo?.name || null,
    plaquette: documents.plaquette?.name || null
  };
  
  // Envoyer les données textuelles + noms des fichiers
  const response = await axios.post('/api/register/etablissement', {
    ...formData,
    documents: documentsData
  });
};
```

### **Option 2 : Upload vers Serveur (Solution complète)**

```typescript
// 1. Créer une route d'upload
app.post('/api/upload/document', upload.single('document'), async (req, res) => {
  // Traiter le fichier uploadé
});

// 2. Modifier le composant pour uploader les fichiers
const uploadDocuments = async () => {
  const formData = new FormData();
  Object.entries(documents).forEach(([key, file]) => {
    if (file) formData.append(key, file);
  });
  
  const response = await axios.post('/api/upload/documents', formData);
  return response.data.documentUrls;
};
```

### **Option 3 : Base de Données avec Références**

```sql
-- Table pour stocker les métadonnées des documents
CREATE TABLE documents_etablissement (
  id SERIAL PRIMARY KEY,
  etablissement_id INTEGER REFERENCES etablissement(id),
  type_document VARCHAR(50), -- 'rccm', 'autorisation', etc.
  nom_fichier VARCHAR(255),
  chemin_fichier VARCHAR(500),
  taille_fichier INTEGER,
  type_mime VARCHAR(100),
  date_upload TIMESTAMP DEFAULT NOW()
);
```

## 🔧 **Implémentation Recommandée (Étape par Étape)**

### **Étape 1 : Validation des Documents (Maintenant)**
- ✅ Vérifier que les documents requis sont sélectionnés
- ✅ Valider les types de fichiers
- ✅ Vérifier la taille des fichiers

### **Étape 2 : Stockage Temporaire (Prochaine)**
- 📁 Stocker les noms des fichiers dans la base
- 📁 Créer une table `documents_pending` pour les établissements en attente

### **Étape 3 : Système d'Upload (Future)**
- 🚀 Implémenter l'upload vers un serveur de fichiers
- 🚀 Intégrer avec un service cloud (AWS S3, Google Cloud Storage) `

## 💡 **Code d'Exemple pour Validation**

```typescript
const validateDocuments = () => {
  const newErrors: Record<string, string> = {};
  
  // Documents requis
  if (!documents.rccmDocument) {
    newErrors.rccmDocument = "Le document RCCM est requis";
  }
  
  if (!documents.autorisation) {
    newErrors.autorisation = "L'autorisation de fonctionnement est requise";
  }
  
  if (!documents.pieceIdentite) {
    newErrors.pieceIdentite = "La pièce d'identité du représentant est requise";
  }
  
  // Validation des types de fichiers
  Object.entries(documents).forEach(([key, file]) => {
    if (file && !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      newErrors[key] = "Type de fichier non supporté. Utilisez PDF, JPG ou PNG";
    }
  });
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

## 🎯 **Prochaines Étapes**

1. **Tester l'inscription établissement** avec les données textuelles
2. **Implémenter la validation des documents** côté frontend
3. **Créer une table pour stocker les références des documents**
4. **Ajouter le système d'upload** quand vous serez prêt

## 📚 **Ressources Utiles**

- [Multer.js](https://github.com/expressjs/multer) - Middleware pour gérer les uploads
- [Sharp](https://sharp.pixelplumbing.com/) - Traitement d'images
- [AWS S3](https://aws.amazon.com/s3/) - Stockage cloud des fichiers
