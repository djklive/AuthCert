# Correction du problème d'authentification JWT

## Problème identifié
L'erreur 403 (Forbidden) se produisait lors de l'accès à la route `/api/apprenant/liaisons` depuis `EstablishmentsScreen.tsx`.

## Cause du problème
Incohérence dans l'accès aux propriétés du token JWT dans les routes du serveur :

1. **Propriété incorrecte** : Les routes utilisaient `req.user.type` au lieu de `req.user.role`
2. **Valeur incorrecte** : Les routes vérifiaient `'apprenant'` au lieu de `'student'`

## Analyse du token JWT
Lors de la connexion, le token est généré avec :
```javascript
const userData = {
  id: apprenant.id_apprenant,
  email: apprenant.email,
  role: 'student',  // ← Propriété 'role' avec valeur 'student'
  nom: apprenant.nom,
  prenom: apprenant.prenom
};
```

## Corrections apportées

### 1. Route GET /api/apprenant/liaisons
**Avant :**
```javascript
const userType = req.user.type;  // ❌ Propriété incorrecte

if (userType !== 'apprenant') {  // ❌ Valeur incorrecte
  return res.status(403).json({
    success: false,
    message: 'Seuls les apprenants peuvent accéder à leurs liaisons'
  });
}
```

**Après :**
```javascript
const userType = req.user.role;  // ✅ Propriété correcte

if (userType !== 'student') {    // ✅ Valeur correcte
  return res.status(403).json({
    success: false,
    message: 'Seuls les apprenants peuvent accéder à leurs liaisons'
  });
}
```

### 2. Route POST /api/liaison/demande
**Avant :**
```javascript
const userType = req.user.type;  // ❌ Propriété incorrecte

if (userType !== 'apprenant') {  // ❌ Valeur incorrecte
  return res.status(403).json({
    success: false,
    message: 'Seuls les apprenants peuvent faire des demandes de liaison'
  });
}
```

**Après :**
```javascript
const userType = req.user.role;  // ✅ Propriété correcte

if (userType !== 'student') {    // ✅ Valeur correcte
  return res.status(403).json({
    success: false,
    message: 'Seuls les apprenants peuvent faire des demandes de liaison'
  });
}
```

## Structure du token JWT
```javascript
{
  id: number,           // ID de l'utilisateur
  email: string,        // Email de l'utilisateur
  role: string,         // 'student', 'establishment', ou 'admin'
  nom: string,          // Nom de l'utilisateur
  prenom?: string,      // Prénom (pour les apprenants)
  statut?: string       // Statut (pour les établissements)
}
```

## Routes affectées
- ✅ `GET /api/apprenant/liaisons` - Corrigée
- ✅ `POST /api/liaison/demande` - Corrigée

## Test recommandé
1. Se connecter en tant qu'apprenant
2. Accéder à la page EstablishmentsScreen
3. Vérifier que les liaisons se chargent correctement
4. Tester la création de nouvelles demandes de liaison

## Note importante
Toutes les routes utilisant l'authentification JWT doivent utiliser `req.user.role` et non `req.user.type` pour accéder au rôle de l'utilisateur.
