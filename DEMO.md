# Démonstration - Système de Connexion avec Rôles

## Test de la Fonctionnalité

### 1. Démarrer l'Application
```bash
npm run dev
```

### 2. Tester la Connexion Apprenant
1. Aller sur `http://localhost:5173/auth`
2. Remplir le formulaire :
   - Email : `apprenant@test.com`
   - Mot de passe : `password123`
   - **Rôle : Sélectionner "Apprenant"**
3. Cliquer sur "Se connecter"
4. **Résultat attendu** : Redirection vers `/dashboard?userType=student`

### 3. Tester la Connexion Établissement
1. Aller sur `http://localhost:5173/auth`
2. Remplir le formulaire :
   - Email : `etablissement@test.com`
   - Mot de passe : `password123`
   - **Rôle : Sélectionner "Établissement"**
3. Cliquer sur "Se connecter"
4. **Résultat attendu** : Redirection vers `/dashboard?userType=establishment`

### 4. Tester la Navigation
- Vérifier que la barre de navigation s'affiche correctement
- Tester les différents onglets selon le rôle
- Vérifier que le nom du rôle s'affiche dans l'en-tête

### 5. Tester la Déconnexion
- Cliquer sur "Se déconnecter" dans la navigation
- **Résultat attendu** : Retour à la page d'accueil (`/`)

## Vérifications à Effectuer

### ✅ Fonctionnalités de Base
- [ ] Sélecteur de rôle s'affiche dans le formulaire de connexion
- [ ] Validation du rôle avant connexion
- [ ] Redirection vers le bon dashboard selon le rôle
- [ ] Barre de navigation s'affiche dans le dashboard
- [ ] Déconnexion fonctionne et redirige vers l'accueil

### ✅ Interface Utilisateur
- [ ] Icônes appropriées pour chaque rôle
- [ ] Messages d'erreur clairs
- [ ] Transitions fluides entre les écrans
- [ ] Responsive design sur mobile

### ✅ Navigation
- [ ] Onglets appropriés selon le rôle
- [ ] Navigation entre les différentes sections
- [ ] État actif des onglets
- [ ] Gestion des notifications

### ✅ Sécurité
- [ ] Impossible d'accéder au dashboard sans authentification
- [ ] Protection des routes dashboard
- [ ] État d'authentification persiste pendant la session
- [ ] Déconnexion réinitialise correctement l'état

## Cas de Test

### Test 1 : Connexion sans Rôle
1. Remplir email et mot de passe
2. Ne pas sélectionner de rôle
3. Cliquer sur "Se connecter"
4. **Attendu** : Message d'erreur "Veuillez sélectionner votre rôle"

### Test 2 : Accès Direct au Dashboard
1. Aller directement sur `/dashboard`
2. **Attendu** : Redirection vers `/auth`

### Test 3 : Changement de Rôle
1. Se connecter en tant qu'apprenant
2. Aller sur `/dashboard?userType=establishment`
3. **Attendu** : Redirection vers le dashboard établissement

### Test 4 : Persistance de Session
1. Se connecter
2. Rafraîchir la page
3. **Attendu** : Reste connecté et affiche le dashboard

## Dépannage

### Problème : Dashboard ne s'affiche pas
**Solution** : Vérifier que l'URL contient le bon paramètre `userType`

### Problème : Erreur de navigation
**Solution** : Vérifier la console pour les erreurs TypeScript

### Problème : Déconnexion ne fonctionne pas
**Solution** : Vérifier que le contexte d'authentification est bien configuré

## Notes de Développement

- L'implémentation utilise un contexte React pour l'état global
- Les types TypeScript ont été adaptés pour la compatibilité
- Le dashboard existant a été intégré sans modification majeure
- La navigation utilise React Router pour la gestion des routes

## Prochaines Étapes

1. **Backend** : Intégrer une vraie API d'authentification
2. **Persistance** : Ajouter localStorage pour la session
3. **Validation** : Améliorer la validation des formulaires
4. **Tests** : Ajouter des tests unitaires et d'intégration
