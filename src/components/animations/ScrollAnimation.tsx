import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface ScrollAnimationProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'zoomIn' | 'scaleIn';
  delay?: number;
  duration?: number;
  threshold?: number;
  className?: string;
  once?: boolean;
}

const animations: Record<string, Variants> = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  },
  slideUp: {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 }
  },
  slideLeft: {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 }
  },
  slideRight: {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0 }
  },
  zoomIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
  }
};

export const ScrollAnimation: React.FC<ScrollAnimationProps> = ({
  children,
  animation = 'fadeIn',
  delay = 0,
  duration = 0.6,
  threshold = 0.1,
  className = '',
  once = true
}) => {
  const [ref, inView] = useInView({
    threshold,
    triggerOnce: once
  });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={animations[animation]}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94] // Smooth easing
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Composant spécialisé pour les sections
export const AnimatedSection: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = '', delay = 0 }) => (
  <ScrollAnimation
    animation="slideUp"
    delay={delay}
    duration={0.8}
    className={className}
  >
    {children}
  </ScrollAnimation>
);

// Composant pour les titres avec animation spéciale
export const AnimatedTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = '', delay = 0 }) => (
  <ScrollAnimation
    animation="slideUp"
    delay={delay}
    duration={1}
    className={className}
  >
    {children}
  </ScrollAnimation>
);

// Composant pour les images avec effet de zoom
export const AnimatedImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  delay?: number;
}> = ({ src, alt, className = '', delay = 0 }) => (
  <ScrollAnimation
    animation="zoomIn"
    delay={delay}
    duration={0.8}
    className={className}
  >
    <img src={src} alt={alt} className={className} />
  </ScrollAnimation>
);

// Composant pour les cartes avec effet de scale
export const AnimatedCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = '', delay = 0 }) => (
  <ScrollAnimation
    animation="scaleIn"
    delay={delay}
    duration={0.6}
    className={className}
  >
    {children}
  </ScrollAnimation>
);
