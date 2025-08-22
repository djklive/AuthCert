# Guide d'Implémentation - Système de Connexion avec Rôles

## Vue d'ensemble

Cette implémentation ajoute un système de connexion avec rôles (Apprenant/Établissement) à votre application AuthCert. Les utilisateurs peuvent maintenant se connecter en choisissant leur rôle et être redirigés vers le dashboard approprié.

## Fonctionnalités Implémentées

### 1. Sélecteur de Rôle dans le Formulaire de Connexion
- Ajout d'un menu déroulant pour choisir entre "Apprenant" et "Établissement"
- Validation obligatoire du rôle avant la connexion
- Interface utilisateur intuitive avec icônes

### 2. Système d'Authentification Global
- Contexte React pour gérer l'état d'authentification
- Gestion centralisée des rôles utilisateur
- Persistance de l'état de connexion pendant la session

### 3. Redirection Automatique vers les Dashboards
- **Apprenant** → Dashboard Apprenant (`/dashboard?userType=student`)
- **Établissement** → Dashboard Établissement (`/dashboard?userType=establishment`)
- Navigation automatique basée sur le rôle sélectionné

### 4. Intégration avec le Dashboard Existant
- Utilisation du code dashboard généré par Figma
- Adaptation des types pour la compatibilité
- Gestion de la déconnexion avec retour à la page d'accueil

## Structure des Fichiers Modifiés

### Fichiers Principaux
- `src/App.tsx` - Ajout du contexte d'authentification et des routes dashboard
- `src/screens/Auth/AuthPage.tsx` - Ajout du sélecteur de rôle et logique de connexion
- `src/dashboard/DashboardWrapper.tsx` - Nouveau composant pour intégrer le dashboard
- `src/dashboard/App.tsx` - Modification pour accepter les paramètres d'authentification
- `src/dashboard/types/index.ts` - Ajout du type NavigateFunction
- `src/dashboard/components/Navigation.tsx` - Gestion de la déconnexion globale

### Nouvelles Routes
- `/dashboard/*` - Route principale pour les dashboards
- `/dashboard?userType=student` - Dashboard apprenant
- `/dashboard?userType=establishment` - Dashboard établissement

## Comment Utiliser

### 1. Connexion
1. Aller sur `/auth` ou `/auth/signup`
2. Remplir le formulaire de connexion
3. **Sélectionner obligatoirement un rôle** (Apprenant ou Établissement)
4. Cliquer sur "Se connecter"
5. Redirection automatique vers le dashboard approprié

### 2. Navigation dans le Dashboard
- Utilisation de la barre de navigation latérale
- Accès aux différentes sections selon le rôle
- Déconnexion via le bouton "Se déconnecter"

### 3. Déconnexion
- Cliquer sur "Se déconnecter" dans la navigation
- Retour automatique à la page d'accueil
- État d'authentification réinitialisé

## Types d'Utilisateurs

### Apprenant (`student`)
- Accès au dashboard apprenant
- Gestion des certificats personnels
- Consultation des établissements
- Suivi des demandes

### Établissement (`establishment`)
- Accès au dashboard établissement
- Gestion des étudiants
- Création de certificats
- Statistiques et rapports

## Gestion des Erreurs

- Validation du rôle avant connexion
- Messages d'erreur clairs pour l'utilisateur
- Redirection automatique en cas d'erreur d'authentification

## Sécurité

- Vérification du rôle à chaque accès au dashboard
- Protection des routes dashboard
- Gestion sécurisée de la déconnexion

## Personnalisation

### Modifier les Rôles
Pour ajouter de nouveaux rôles, modifier :
- `src/dashboard/types/index.ts` - Ajouter le nouveau type
- `src/screens/Auth/AuthPage.tsx` - Ajouter l'option dans le sélecteur
- `src/dashboard/utils/navigation.ts` - Configurer la navigation

### Modifier la Navigation
- `src/dashboard/utils/navigation.ts` - Définir les éléments de navigation par rôle
- `src/dashboard/components/Navigation.tsx` - Personnaliser l'affichage

## Dépannage

### Problèmes Courants
1. **Erreur de compilation TypeScript** - Vérifier les types dans `types/index.ts`
2. **Redirection qui ne fonctionne pas** - Vérifier les routes dans `App.tsx`
3. **Dashboard qui ne s'affiche pas** - Vérifier les paramètres d'URL

### Logs de Débogage
- Vérifier la console du navigateur pour les erreurs
- Contrôler les paramètres d'URL lors de la navigation
- Vérifier l'état du contexte d'authentification

## Évolutions Futures

- Ajout de la persistance de session (localStorage)
- Intégration avec un backend d'authentification
- Gestion des permissions granulaires
- Support multi-tenant pour les établissements

## Support

Pour toute question ou problème, vérifier :
1. La console du navigateur
2. Les types TypeScript
3. La structure des composants
4. La configuration des routes
