# 🧪 Guide de Tests Rapide

## ✅ Checklist de Tests - Notifications et Dashboards

---

## 🎓 Tests Apprenant

### Test 1 : Dashboard Apprenant
- [ ] Connecte-toi en tant qu'**apprenant**
- [ ] Va sur **Dashboard**
- [ ] ✅ Vérifie : Les KPIs affichent des nombres réels (pas toujours 12)
- [ ] ✅ Vérifie : Les certificats récents correspondent à tes vrais certificats
- [ ] ✅ Vérifie : Les notifications affichent tes vraies notifications
- [ ] ✅ Vérifie : Le graphique montre des données réelles

### Test 2 : Notifications Apprenant
- [ ] Va sur **Notifications**
- [ ] ✅ Vérifie : Tu vois des notifications de type :
  - `NOUVEAU_CERTIFICAT`
  - `DEMANDE_LIAISON_APPROUVEE`
  - `DEMANDE_CERTIFICAT_APPROUVEE`
- [ ] ❌ Vérifie : Tu ne vois PAS de notifications de type :
  - `DEMANDE_LIAISON_APPRENANT` (réservé aux établissements)
  - `DEMANDE_CERTIFICAT_NOUVELLE` (réservé aux établissements)
- [ ] ✅ Clique sur "Marquer comme lu" → Doit fonctionner
- [ ] ✅ Clique sur "Supprimer" → Doit fonctionner

### Test 3 : Badge Navigation
- [ ] Regarde le badge sur l'icône **Notifications** dans la navigation
- [ ] ✅ Vérifie : Le nombre correspond au nombre de notifications non lues
- [ ] Marque toutes les notifications comme lues
- [ ] ✅ Vérifie : Le badge disparaît ou affiche "0"

---

## 🏫 Tests Établissement

### Test 4 : Dashboard Établissement
- [ ] Connecte-toi en tant qu'**établissement**
- [ ] Va sur **Dashboard**
- [ ] ✅ Vérifie : Les KPIs affichent :
  - Certificats émis ce mois (nombre réel)
  - Vérifications ce mois
  - Étudiants actifs
  - Demandes en attente
- [ ] ✅ Vérifie : Les demandes en attente affichent de vrais étudiants
- [ ] ✅ Vérifie : L'activité récente montre des actions réelles

### Test 5 : Statistiques Établissement
- [ ] Va sur **Statistiques**
- [ ] ✅ Vérifie : Le top 5 certificats affiche tes vrais certificats
- [ ] Change le filtre de période (7j → 30j → 90j → 1an)
- [ ] ✅ Vérifie : Les graphiques changent selon la période
- [ ] Clique sur "Exporter le rapport PDF"
- [ ] ✅ Vérifie : Un fichier CSV est téléchargé

### Test 6 : Notifications Établissement
- [ ] Va sur **Notifications**
- [ ] ✅ Vérifie : Tu vois des notifications de type :
  - `DEMANDE_LIAISON_APPRENANT`
  - `DEMANDE_CERTIFICAT_NOUVELLE`
  - `VERIFICATION_CERTIFICAT`
- [ ] ❌ Vérifie : Tu ne vois PAS de notifications de type :
  - `NOUVEAU_CERTIFICAT` (réservé aux apprenants)
  - `DEMANDE_LIAISON_APPROUVEE` (réservé aux apprenants)

---

## 🔄 Tests Cross-Role (Filtrage)

### Test 7 : Isolation des Notifications
**Objectif** : Prouver que les notifications sont bien séparées par rôle

1. **En tant qu'apprenant** :
   - [ ] Note le nombre de notifications dans le badge : **X**
   - [ ] Note le titre de la 1ère notification : **"..."**

2. **Déconnecte-toi**

3. **En tant qu'établissement** :
   - [ ] Note le nombre de notifications dans le badge : **Y**
   - [ ] Note le titre de la 1ère notification : **"..."**

4. **Vérification** :
   - [ ] ✅ Le nombre X ≠ Y (différent)
   - [ ] ✅ Les titres sont différents
   - [ ] ✅ Les types de notifications sont différents

---

## 🔔 Tests de Création de Notifications

### Test 8 : Émission de Certificat
1. Connecte-toi en tant qu'**établissement**
2. Va sur **Créer un certificat**
3. Crée et émets un certificat pour un étudiant
4. ✅ **Vérifie côté établissement** : Aucune nouvelle notification
5. Déconnecte-toi
6. Connecte-toi en tant qu'**apprenant** (l'étudiant qui a reçu le certificat)
7. ✅ **Vérifie** : Tu as une notification `NOUVEAU_CERTIFICAT`
8. ✅ **Vérifie** : Le badge dans Navigation a augmenté de +1

### Test 9 : Demande de Liaison
1. Connecte-toi en tant qu'**apprenant**
2. Crée un nouveau compte ou demande une liaison
3. ✅ **Vérifie côté apprenant** : Aucune notification immédiate
4. Déconnecte-toi
5. Connecte-toi en tant qu'**établissement** (celui demandé)
6. ✅ **Vérifie** : Tu as une notification `DEMANDE_LIAISON_APPRENANT`
7. Approuve la demande
8. Déconnecte-toi
9. Reconnecte-toi en tant qu'**apprenant**
10. ✅ **Vérifie** : Tu as une nouvelle notification `DEMANDE_LIAISON_APPROUVEE`

### Test 10 : Vérification de Certificat
1. Connecte-toi en tant qu'**apprenant**
2. Va sur **Certificats**
3. Copie l'UUID d'un certificat
4. Déconnecte-toi
5. Va sur la page publique `/verifier-certificat`
6. Colle l'UUID et vérifie
7. Reconnecte-toi en tant qu'**établissement** (qui a émis le certificat)
8. Va sur **Notifications**
9. ✅ **Vérifie** : Tu as une notification `VERIFICATION_CERTIFICAT`
10. Vérifie le même certificat 10 fois de plus
11. ✅ **Vérifie** : Une seule notification (anti-spam 24h)

---

## 🐛 Debugging

### Si les notifications n'apparaissent pas :

#### 1. Vérifier la console backend :
```
📬 Notification créée pour apprenant 5: Nouveau certificat disponible
```

#### 2. Vérifier la console frontend :
```javascript
console.log('📊 Notifications chargées:', response.data);
```

#### 3. Vérifier la base de données :
```sql
-- Voir toutes les notifications
SELECT * FROM notifications ORDER BY "createdAt" DESC LIMIT 10;

-- Compter par type
SELECT type, COUNT(*) FROM notifications GROUP BY type;

-- Compter par utilisateur
SELECT "userId", "userType", COUNT(*) FROM notifications 
GROUP BY "userId", "userType";
```

#### 4. Vérifier le token JWT :
- Ouvre la console navigateur
- Onglet "Application" → "Local Storage"
- Cherche la clé `authToken`
- Décode sur jwt.io
- ✅ Vérifie : `role` et `id` sont corrects

---

## ✅ Validation Finale

### Tous les tests passent si :
- [ ] ✅ Dashboard apprenant affiche des données réelles
- [ ] ✅ Dashboard établissement affiche des données réelles
- [ ] ✅ Statistiques établissement affichent des données réelles
- [ ] ✅ Notifications apprenant ≠ Notifications établissement
- [ ] ✅ Badge navigation affiche le bon nombre
- [ ] ✅ Création automatique de notifications fonctionne
- [ ] ✅ Actions (lu/supprimer) fonctionnent
- [ ] ✅ États de chargement/erreur s'affichent correctement

---

## 🎊 Si Tout Fonctionne

**Félicitations ! Le système est 100% opérationnel !**

Les pages suivantes sont **sans mocks et complètement fonctionnelles** :
1. ✅ DashboardScreen.tsx (apprenant)
2. ✅ EstablishmentDashboardScreen.tsx (établissement)
3. ✅ EstablishmentStatsScreen.tsx (établissement)
4. ✅ NotificationsScreen.tsx (les deux rôles)
5. ✅ Navigation.tsx (badge dynamique)

**Prêt pour la production ! 🚀**

