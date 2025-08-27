# 🎨 Guide des Animations - AuthCert

Ce guide explique comment utiliser les composants d'animation pour créer des expériences utilisateur engageantes et fluides.

## 📦 Composants Disponibles

### 1. Animations de Base (`ScrollAnimation.tsx`)

#### `ScrollAnimation`
Composant principal pour les animations au scroll.

```tsx
import { ScrollAnimation } from '../components/animations/ScrollAnimation';

<ScrollAnimation 
  animation="slideUp" 
  delay={0.2} 
  duration={0.8}
>
  <div>Votre contenu ici</div>
</ScrollAnimation>
```

**Props disponibles :**
- `animation`: 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'zoomIn' | 'scaleIn'
- `delay`: Délai avant l'animation (en secondes)
- `duration`: Durée de l'animation (en secondes)
- `threshold`: Seuil de déclenchement (0-1)
- `once`: Animation une seule fois (true/false)

#### `AnimatedSection`
Section avec animation slideUp par défaut.

```tsx
import { AnimatedSection } from '../components/animations/ScrollAnimation';

<AnimatedSection delay={0.3}>
  <YourComponent />
</AnimatedSection>
```

#### `AnimatedTitle`
Titre avec animation spéciale.

```tsx
import { AnimatedTitle } from '../components/animations/ScrollAnimation';

<AnimatedTitle delay={0.2}>
  <h1>Votre titre</h1>
</AnimatedTitle>
```

#### `AnimatedImage`
Image avec effet de zoom.

```tsx
import { AnimatedImage } from '../components/animations/ScrollAnimation';

<AnimatedImage 
  src="/image.jpg" 
  alt="Description" 
  delay={0.4}
/>
```

#### `AnimatedCard`
Carte avec effet de scale.

```tsx
import { AnimatedCard } from '../components/animations/ScrollAnimation';

<AnimatedCard delay={0.5}>
  <Card>Contenu de la carte</Card>
</AnimatedCard>
```

### 2. Animations Avancées (`AdvancedAnimations.tsx`)

#### `AnimatedText`
Animation lettre par lettre.

```tsx
import { AnimatedText } from '../components/animations/AdvancedAnimations';

<AnimatedText 
  text="Votre texte animé" 
  delay={0.2} 
  staggerDelay={0.05}
/>
```

#### `ParallaxImage`
Image avec effet parallax.

```tsx
import { ParallaxImage } from '../components/animations/AdvancedAnimations';

<ParallaxImage 
  src="/image.jpg" 
  alt="Description" 
  speed={0.5}
/>
```

#### `StaggerList`
Liste avec animation en cascade.

```tsx
import { StaggerList } from '../components/animations/AdvancedAnimations';

<StaggerList staggerDelay={0.1}>
  <li>Élément 1</li>
  <li>Élément 2</li>
  <li>Élément 3</li>
</StaggerList>
```

#### `AnimatedCounter`
Compteur animé.

```tsx
import { AnimatedCounter } from '../components/animations/AdvancedAnimations';

<AnimatedCounter 
  value={1000} 
  duration={2} 
  delay={0.5}
/>
```

#### `HoverCard`
Carte avec effet hover.

```tsx
import { HoverCard } from '../components/animations/AdvancedAnimations';

<HoverCard scale={1.05}>
  <div>Contenu avec effet hover</div>
</HoverCard>
```

## 🎯 Stratégies d'Animation

### 1. Séquence d'Animations
Utilisez des délais progressifs pour créer un effet de cascade :

```tsx
<AnimatedSection delay={0.1}>
  <Header />
</AnimatedSection>

<AnimatedSection delay={0.2}>
  <MainContent />
</AnimatedSection>

<AnimatedSection delay={0.3}>
  <Footer />
</AnimatedSection>
```

### 2. Animations par Type de Contenu
- **Titres** : `AnimatedTitle` avec `slideUp`
- **Images** : `AnimatedImage` avec `zoomIn`
- **Cartes** : `AnimatedCard` avec `scaleIn`
- **Sections** : `AnimatedSection` avec `slideUp`

### 3. Optimisation des Performances
- Utilisez `once={true}` pour éviter les re-animations
- Limitez le nombre d'animations simultanées
- Privilégiez les animations CSS (transform, opacity)

## 🚀 Exemples d'Implémentation

### Page d'Accueil
```tsx
export const PageDAccueil = () => {
  return (
    <div>
      <Header />
      
      <AnimatedSection delay={0.1}>
        <HeroSection />
      </AnimatedSection>
      
      <AnimatedSection delay={0.2}>
        <FeaturesSection />
      </AnimatedSection>
      
      <AnimatedSection delay={0.3}>
        <TestimonialsSection />
      </AnimatedSection>
    </div>
  );
};
```

### Section avec Contenu Mixte
```tsx
<AnimatedSection delay={0.2}>
  <div className="grid grid-cols-2 gap-8">
    <AnimatedTitle delay={0.3}>
      <h2>Titre de la section</h2>
    </AnimatedTitle>
    
    <AnimatedImage 
      src="/image.jpg" 
      alt="Description" 
      delay={0.4}
    />
  </div>
</AnimatedSection>
```

### Liste Animée
```tsx
<StaggerList staggerDelay={0.1}>
  <li className="p-4 bg-white rounded-lg shadow">
    <h3>Fonctionnalité 1</h3>
    <p>Description...</p>
  </li>
  <li className="p-4 bg-white rounded-lg shadow">
    <h3>Fonctionnalité 2</h3>
    <p>Description...</p>
  </li>
</StaggerList>
```

## ⚡ Bonnes Pratiques

1. **Délais Cohérents** : Utilisez des délais de 0.1s à 0.3s entre les éléments
2. **Durées Appropriées** : 0.6s à 0.8s pour la plupart des animations
3. **Seuils Optimaux** : 0.1 pour déclencher tôt, 0.5 pour déclencher au centre
4. **Animations Uniques** : `once={true}` pour éviter les re-animations
5. **Performance** : Limitez à 3-4 animations simultanées

## 🔧 Personnalisation

### Créer une Animation Personnalisée
```tsx
const customAnimation = {
  hidden: { opacity: 0, rotate: -180, scale: 0 },
  visible: { opacity: 1, rotate: 0, scale: 1 }
};

<ScrollAnimation 
  animation="custom" 
  variants={customAnimation}
>
  <div>Contenu personnalisé</div>
</ScrollAnimation>
```

### Modifier les Transitions
```tsx
<ScrollAnimation 
  animation="slideUp"
  transition={{
    type: "spring",
    stiffness: 200,
    damping: 20
  }}
>
  <div>Contenu avec transition personnalisée</div>
</ScrollAnimation>
```

## 📱 Responsive et Accessibilité

- Les animations sont automatiquement désactivées sur mobile si nécessaire
- Utilisez `prefers-reduced-motion` pour respecter les préférences utilisateur
- Testez sur différents appareils pour vérifier les performances

## 🎨 Palette d'Animations Recommandées

| Type de Contenu | Animation | Délai | Durée |
|----------------|-----------|-------|-------|
| Header/Logo | fadeIn | 0.1s | 0.6s |
| Titres | slideUp | 0.2s | 0.8s |
| Images | zoomIn | 0.3s | 0.8s |
| Cartes | scaleIn | 0.4s | 0.6s |
| Boutons | slideUp | 0.5s | 0.5s |
| Sections | slideUp | 0.1s | 0.8s |

---

**💡 Conseil** : Commencez par des animations simples et ajoutez progressivement des effets plus complexes. L'objectif est d'améliorer l'expérience utilisateur, pas de la surcharger !
