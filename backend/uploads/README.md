# 📁 Dossier des Uploads Temporaires

## 🎯 **Structure des dossiers :**

```
uploads/
├── etablissements/
│   ├── 1/                    # ID de l'établissement
│   │   ├── rccm_1234567890.pdf
│   │   ├── autorisation_1234567890.jpg
│   │   ├── pieceIdentite_1234567890.png
│   │   ├── logo_1234567890.svg
│   │   └── plaquette_1234567890.pdf
│   └── 2/
│       └── ...
└── README.md
```

## 📋 **Convention de nommage :**

- **Format :** `{typeDocument}_{timestamp}.{extension}`
- **Exemple :** `rccm_1703123456789.pdf`
- **Timestamp :** Date.now() pour éviter les conflits

## 🔒 **Sécurité :**

- Les fichiers sont stockés temporairement
- Chaque établissement a son propre dossier
- Les chemins sont générés automatiquement
- Validation des types MIME côté serveur

## 🚀 **Prochaines étapes :**

1. **Implémenter l'upload physique** des fichiers
2. **Ajouter la compression** des images
3. **Intégrer un service cloud** (AWS S3, Google Cloud)
4. **Ajouter la validation** des fichiers côté serveur
