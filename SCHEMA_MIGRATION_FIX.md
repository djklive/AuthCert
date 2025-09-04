# Correction du problème de schéma Prisma

## Problème identifié
L'erreur suivante se produisait lors de l'exécution du serveur :
```
Unknown field `etablissementId` for select statement on model `Apprenant`
```

## Cause du problème
Le schéma Prisma a été mis à jour pour implémenter le système de liaison many-to-many entre apprenants et établissements, mais le code du serveur utilisait encore l'ancien système avec le champ `etablissementId` dans le modèle `Apprenant`.

## Changements apportés

### 1. Mise à jour de la route GET /api/admin/apprenants
**Avant :**
```javascript
const apprenants = await prisma.apprenant.findMany({
  select: {
    // ... autres champs
    etablissementId: true,
    etablissement: {
      select: {
        nomEtablissement: true
      }
    }
  }
});
```

**Après :**
```javascript
const apprenants = await prisma.apprenant.findMany({
  select: {
    // ... autres champs
    liaisons: {
      select: {
        id: true,
        statutLiaison: true,
        dateDemande: true,
        etablissement: {
          select: {
            id_etablissement: true,
            nomEtablissement: true,
            typeEtablissement: true
          }
        }
      }
    }
  }
});
```

### 2. Mise à jour de la route POST /api/admin/apprenant
**Avant :**
```javascript
const { email, motDePasse, nom, prenom, telephone, etablissementId } = req.body;

const apprenant = await prisma.apprenant.create({
  data: {
    // ... autres champs
    etablissementId: etablissementId ? parseInt(etablissementId) : null,
  }
});
```

**Après :**
```javascript
const { email, motDePasse, nom, prenom, telephone, etablissements } = req.body;

const apprenant = await prisma.apprenant.create({
  data: {
    // ... autres champs (sans etablissementId)
  }
});

// Créer les liaisons avec les établissements si fournis
if (etablissements && etablissements.length > 0) {
  const liaisonPromises = etablissements.map(async (nomEtablissement) => {
    const etablissement = await prisma.etablissement.findFirst({
      where: { 
        nomEtablissement: nomEtablissement,
        statut: 'ACTIF'
      }
    });

    if (etablissement) {
      return prisma.liaisonApprenantEtablissement.create({
        data: {
          apprenantId: apprenant.id_apprenant,
          etablissementId: etablissement.id_etablissement,
          statutLiaison: 'APPROUVE', // Les créations admin sont automatiquement approuvées
          dateApprobation: new Date()
        }
      });
    }
    return null;
  });

  await Promise.all(liaisonPromises.filter(promise => promise !== null));
}
```

## Avantages de la nouvelle approche
1. **Système many-to-many** : Un apprenant peut être lié à plusieurs établissements
2. **Gestion des statuts** : Chaque liaison a son propre statut (EN_ATTENTE, APPROUVE, REJETE, SUSPENDU)
3. **Traçabilité** : Dates de demande, approbation, rejet
4. **Messages** : Possibilité d'ajouter des messages lors des demandes/réponses
5. **Flexibilité** : Système plus robuste pour gérer les relations complexes

## Routes encore à corriger
Il reste d'autres routes dans le serveur qui utilisent encore l'ancien système avec `etablissementId`. Ces routes devront être mises à jour progressivement :

- Routes de récupération d'apprenants par établissement
- Routes de mise à jour d'apprenants
- Routes de suppression d'apprenants

## Test recommandé
1. Tester la route GET /api/admin/apprenants
2. Tester la route POST /api/admin/apprenant avec des établissements
3. Vérifier que les liaisons sont créées correctement
4. Tester l'affichage des apprenants avec leurs liaisons dans l'interface admin

