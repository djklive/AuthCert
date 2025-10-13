# 🔑 Comment Utiliser "Mot de Passe Oublié" ?

## 📖 Guide Simple pour les Utilisateurs

---

## 🎯 Scénario : J'ai oublié mon mot de passe

### **Étape 1 : Demander la réinitialisation** 

1. Va sur la page de **connexion** : `http://localhost:5173/auth`

2. En bas du formulaire, clique sur **"Mot de passe oublié ?"**
   ```
   ☐ Se souvenir de moi    [Mot de passe oublié ?] ← CLIC ICI
   ```

3. Une **fenêtre (modal)** s'ouvre :
   ```
   ┌────────────────────────────────────┐
   │  📧 Mot de passe oublié ?         │
   │                                    │
   │  Votre email : ________________   │
   │  Type compte : [Apprenant    ▼]   │
   │                                    │
   │  [Annuler]  [Envoyer le lien →]   │
   └────────────────────────────────────┘
   ```

4. **Saisit ton email** (celui utilisé pour t'inscrire)

5. **Sélectionne ton type** de compte :
   - 👤 **Apprenant** (si tu es étudiant)
   - 🏫 **Établissement** (si tu es une école)

6. Clique sur **"Envoyer le lien"**

7. **Succès !** Une nouvelle fenêtre apparaît :
   ```
   ┌────────────────────────────────────┐
   │         ✅                         │
   │    Email envoyé !                 │
   │                                    │
   │  Si un compte existe avec cet     │
   │  email, tu recevras un lien       │
   │                                    │
   │  🔧 Mode Développement :           │
   │  Clique sur ce lien :              │
   │  http://localhost:5173/reset-...  │
   │                                    │
   │  [Compris]                         │
   └────────────────────────────────────┘
   ```

---

### **Étape 2 : Réinitialiser le mot de passe**

1. **Clique sur le lien** affiché (en développement)
   - En production : Vérifie ta **boîte email** 📧

2. Une **nouvelle page** s'ouvre automatiquement

3. La page **vérifie le lien** :
   ```
   ⏳ Vérification du lien...
   ```

4. Si le lien est **valide**, le formulaire apparaît :
   ```
   ┌────────────────────────────────────┐
   │  🔒 Nouveau mot de passe          │
   │  Pour user@example.com            │
   │                                    │
   │  Nouveau mot de passe :            │
   │  ________________                  │
   │                                    │
   │  Confirmer le mot de passe :       │
   │  ________________                  │
   │                                    │
   │  ✅ Conseils :                     │
   │  • Au moins 6 caractères           │
   │  • Majuscules et minuscules        │
   │  • Chiffres et symboles            │
   │                                    │
   │  [Réinitialiser le mot de passe]  │
   └────────────────────────────────────┘
   ```

5. **Saisit ton nouveau mot de passe** (au moins 6 caractères)

6. **Confirme** en le tapant une deuxième fois

7. Clique sur **"Réinitialiser le mot de passe"**

8. **Succès !** :
   ```
   ┌────────────────────────────────────┐
   │         ✅                         │
   │  Mot de passe réinitialisé !      │
   │                                    │
   │  Ton mot de passe a été changé    │
   │  avec succès.                     │
   │                                    │
   │  ⏳ Redirection en cours...        │
   └────────────────────────────────────┘
   ```

9. **Redirection automatique** vers la page de connexion (3 secondes)

10. **Connecte-toi** avec ton **nouveau mot de passe** ! 🎉

---

## ⚠️ Erreurs Possibles

### **1. "Lien invalide ou expiré"**

**Raisons** :
- ⏱️ Le lien a **plus d'1 heure**
- 🔗 Le lien a déjà été **utilisé**
- ❌ Le lien est **incorrect**

**Solution** :
- Retourne sur `/auth`
- Clique à nouveau "Mot de passe oublié ?"
- Demande un **nouveau lien**

---

### **2. "Les mots de passe ne correspondent pas"**

**Raison** :
- Les deux mots de passe saisis sont différents

**Solution** :
- Vérifie que tu as tapé **exactement le même** mot de passe deux fois
- Attention aux majuscules/minuscules

---

### **3. "Le mot de passe doit contenir au moins 6 caractères"**

**Raison** :
- Ton nouveau mot de passe est trop court

**Solution** :
- Choisis un mot de passe **plus long** (≥ 6 caractères)
- Exemple : `MonNouveauMDP2025`

---

## 💡 Conseils

### **Pour un mot de passe sécurisé** :

✅ **Au moins 6 caractères** (plus c'est mieux)
✅ **Mélange** majuscules et minuscules
✅ **Inclut** des chiffres
✅ **Ajoute** des symboles (!@#$%)
❌ **Évite** les mots du dictionnaire
❌ **N'utilise pas** de dates de naissance

**Exemples de bons mots de passe** :
- `SuperSecure2025!`
- `M0nP@ssw0rd123`
- `Cert1f1c@t2025`

---

## 🕐 Délais Importants

- ⏱️ **Lien valable** : 1 heure
- 🔄 **Redirection auto** : 3 secondes après succès
- 📧 **Email en prod** : Reçu en ~30 secondes

---

## 🎯 FAQ

### **Q : Combien de fois puis-je demander un nouveau lien ?**
**R** : Autant que nécessaire. Chaque nouveau lien **invalide automatiquement** l'ancien.

### **Q : Que se passe-t-il si je suis connecté sur plusieurs appareils ?**
**R** : Après la réinitialisation, **toutes les sessions sont déconnectées** pour ta sécurité. Tu devras te reconnecter partout.

### **Q : Puis-je utiliser le même lien deux fois ?**
**R** : Non, chaque lien est à **usage unique**. Une fois utilisé, il ne fonctionne plus.

### **Q : J'ai reçu un email mais je n'ai rien demandé. Que faire ?**
**R** : **Ignore l'email**. Si tu n'as rien demandé, quelqu'un a peut-être saisi ton email par erreur. Ton compte reste sécurisé tant que tu ne cliques pas sur le lien.

### **Q : Le lien fonctionne en mode développement ?**
**R** : Oui ! Le lien est affiché directement dans le modal. Pas besoin de configuration email.

---

## 🎊 Récapitulatif

### **En 2 étapes** :

```
1️⃣ Demander un lien
   ↓
   Clique "Mot de passe oublié ?"
   → Saisit email + type
   → Lien affiché (dev)

2️⃣ Réinitialiser
   ↓
   Clique sur le lien
   → Saisit nouveau MDP
   → Confirmation + Redirection
   → ✅ Connexion avec nouveau MDP
```

**C'est tout ! Simple et rapide ! 🚀**

---

## 📞 Besoin d'Aide ?

### **Problème technique ?**
- Vérifie la console du navigateur (F12)
- Vérifie les logs du serveur
- Consulte `GUIDE_TEST_MOT_DE_PASSE.md`

### **Erreur persistante ?**
- Demande un nouveau lien
- Vide le cache du navigateur
- Redémarre le serveur

**Tout devrait fonctionner ! 🎉**

