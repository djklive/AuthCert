# 🎓 Filtre par Étudiant - CertificatesScreen.tsx

## ✅ Fonctionnalité Ajoutée

### 🎯 Objectif
Permettre aux **établissements** de filtrer les certificats par **étudiant** pour faciliter la gestion et la recherche.

---

## 📊 Modifications Apportées

### **Backend** - `server.js`

#### Route `GET /api/certificats` (ligne 4990-4997)
**Ajout** : Inclusion des informations de l'apprenant dans la réponse

```javascript
const certificats = await prisma.certificat.findMany({
  where,
  orderBy: { createdAt: 'desc' },
  include: {
    formation: { ... },
    etablissement: { ... },
    apprenant: {           // ✅ NOUVEAU
      select: {
        id_apprenant: true,
        nom: true,
        prenom: true,
        email: true
      }
    },
    _count: { ... }
  }
});
```

**Résultat** : Chaque certificat retourné contient maintenant les informations de l'apprenant.

---

### **Frontend** - `CertificatesScreen.tsx`

#### 1. Interface `CertificateDto` (ligne 60-65)
**Ajout** : Type pour les données de l'apprenant

```typescript
interface CertificateDto {
  // ... champs existants ...
  apprenant?: {          // ✅ NOUVEAU
    id_apprenant: number;
    nom: string;
    prenom: string;
    email: string;
  };
  // ...
}
```

#### 2. State pour le filtre (ligne 90)
**Ajout** : État pour le filtre par étudiant

```typescript
const [selectedApprenant, setSelectedApprenant] = useState<string>('all');
```

#### 3. Logique de filtrage (ligne 180-181)
**Ajout** : Condition de filtrage par apprenant

```typescript
const filteredCertificates = useMemo(() => {
  const filtered = certificates.filter((cert) => {
    const matchesSearch = ...;
    const matchesStatus = ...;
    const matchesFormation = ...;
    const matchesEtablissement = ...;
    const matchesApprenant = selectedApprenant === 'all' ||   // ✅ NOUVEAU
      (cert.apprenant && cert.apprenant.id_apprenant === parseInt(selectedApprenant));
    const matchesRole = ...;
    
    return matchesSearch && matchesStatus && matchesFormation && 
           matchesEtablissement && matchesApprenant && matchesRole;  // ✅ NOUVEAU
  });
}, [certificates, ..., selectedApprenant, ...]);  // ✅ NOUVEAU dans les dépendances
```

#### 4. Composant Select (ligne 574-589)
**Ajout** : Sélecteur de filtre par étudiant (visible uniquement pour établissements)

```tsx
{/* Filtre par étudiant - visible uniquement pour les établissements */}
{user?.role === 'establishment' && (
  <Select value={selectedApprenant} onValueChange={setSelectedApprenant}>
    <SelectTrigger className="w-48">
      <SelectValue placeholder="Étudiant" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Tous les étudiants</SelectItem>
      {Array.from(new Set(certificates.map(cert => cert.apprenant).filter(Boolean))).map((apprenant) => (
        <SelectItem key={apprenant!.id_apprenant} value={apprenant!.id_apprenant.toString()}>
          {apprenant!.prenom} {apprenant!.nom}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

#### 5. Affichage dans les cartes (ligne 376-382)
**Ajout** : Nom de l'étudiant affiché pour les établissements

```tsx
{/* Affichage de l'étudiant pour les établissements */}
{user?.role === 'establishment' && certificate.apprenant && (
  <div className={`flex items-center ${isGridView ? 'justify-center' : ''} text-sm text-muted-foreground mb-2`}>
    <Award className="mr-1 h-3 w-3" />
    <span>{certificate.apprenant.prenom} {certificate.apprenant.nom}</span>
  </div>
)}
```

---

## 🎨 Interface Utilisateur

### **Vue Établissement** :

#### Barre de filtres :
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Rechercher...  │ Statut ▼ │ Formation ▼ │ Étudiant ▼ │ 🔲 📄 │
└─────────────────────────────────────────────────────────────────┘
```

#### Carte de certificat :
```
┌───────────────────────────────────────────┐
│ 🏆  Master en Marketing Digital          │
│     Émis le 12/10/2025                    │
│     👤 Jean Dupont                        │ ← NOUVEAU
│     📚 Formation Marketing                │
│     👁️ 24 vérifications                  │
│     ✅ Vérifié                            │
└───────────────────────────────────────────┘
```

### **Vue Étudiant** (inchangé) :

#### Barre de filtres :
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Rechercher...  │ Statut ▼ │ Formation ▼ │ Établissement ▼ │🔲📄│
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Filtres Disponibles par Rôle

### **🏫 Établissements** peuvent filtrer par :
1. ✅ **Statut** (Tous, Émis, Révoqués, Brouillons, etc.)
2. ✅ **Formation** (Toutes les formations créées)
3. ✅ **Étudiant** (Tous les étudiants liés) **← NOUVEAU**

### **🎓 Étudiants** peuvent filtrer par :
1. ✅ **Statut** (Tous, Émis, Révoqués)
2. ✅ **Formation** (Si disponible)
3. ✅ **Établissement** (Tous les établissements émetteurs)

---

## 💡 Utilisation

### Cas d'usage pour les établissements :

#### Scénario 1 : Trouver tous les certificats d'un étudiant spécifique
1. Va sur **Certificats**
2. Clique sur le filtre **"Étudiant"**
3. Sélectionne "Jean Dupont"
4. ✅ **Résultat** : Affiche uniquement les certificats de Jean Dupont

#### Scénario 2 : Filtres combinés
1. Sélectionne **Statut** : "Émis"
2. Sélectionne **Formation** : "Master Marketing"
3. Sélectionne **Étudiant** : "Marie Martin"
4. ✅ **Résultat** : Affiche uniquement les certificats **émis** en **Master Marketing** pour **Marie Martin**

#### Scénario 3 : Recherche + filtre
1. Tape "Master" dans la recherche
2. Sélectionne **Étudiant** : "Sophie Laurent"
3. ✅ **Résultat** : Tous les certificats contenant "Master" pour Sophie Laurent

---

## 🎯 Avantages

### Pour les établissements :
- ✅ **Gestion facilitée** : Retrouver rapidement les certificats d'un étudiant
- ✅ **Audit** : Vérifier tous les certificats émis pour un étudiant
- ✅ **Statistiques** : Voir combien de certificats par étudiant
- ✅ **Suivi** : Identifier les étudiants avec le plus de certificats

### Exemples concrets :
- Un directeur veut voir tous les certificats de "Jean Dupont" → Filtre par étudiant
- Une secrétaire veut vérifier les certificats "Émis" pour "Marie Martin" → Filtre statut + étudiant
- Un responsable pédagogique veut voir les "Master Marketing" de "Sophie Laurent" → Filtre formation + étudiant

---

## 🧪 Tests

### Test 1 : Filtre par étudiant
1. Connecte-toi en tant qu'**établissement**
2. Va sur **Certificats**
3. Vérifie que le filtre "Étudiant" apparaît
4. Sélectionne un étudiant
5. ✅ **Résultat** : Seuls les certificats de cet étudiant sont affichés

### Test 2 : Combinaison de filtres
1. Sélectionne **Statut** : "Émis"
2. Sélectionne **Étudiant** : Un étudiant spécifique
3. ✅ **Résultat** : Certificats émis pour cet étudiant uniquement

### Test 3 : Vérifier en tant qu'étudiant
1. Connecte-toi en tant qu'**étudiant**
2. Va sur **Certificats**
3. ✅ **Résultat** : Le filtre "Étudiant" n'apparaît PAS (réservé aux établissements)
4. ✅ **Résultat** : Le filtre "Établissement" apparaît (pour voir par établissement émetteur)

---

## 📝 Liste de Filtres Finale

### Établissement voit :
```
┌────────────────────────────────────────────────────┐
│ 🔍 Recherche  │ Statut │ Formation │ 👤 Étudiant  │
└────────────────────────────────────────────────────┘
```

### Étudiant voit :
```
┌────────────────────────────────────────────────────┐
│ 🔍 Recherche  │ Statut │ Formation │ 🏫 Établ.   │
└────────────────────────────────────────────────────┘
```

**Chaque rôle a ses filtres adaptés à ses besoins !**

---

## ✅ Résumé

| Élément | Avant | Après |
|---------|-------|-------|
| **Backend API** | ❌ Pas d'info apprenant | ✅ Inclut `apprenant` avec nom/prénom/email |
| **Interface CertificateDto** | ❌ Pas de type apprenant | ✅ Type `apprenant?` ajouté |
| **State selectedApprenant** | ❌ N'existe pas | ✅ Créé |
| **Logique de filtrage** | ❌ Pas de filtre étudiant | ✅ `matchesApprenant` ajouté |
| **UI - Select Étudiant** | ❌ Pas de sélecteur | ✅ Sélecteur visible pour établissements |
| **UI - Carte certificat** | ❌ Pas d'affichage étudiant | ✅ Affiche nom étudiant pour établissements |

**Fonctionnalité 100% opérationnelle ! 🎉**

