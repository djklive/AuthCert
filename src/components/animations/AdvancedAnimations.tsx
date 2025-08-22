import React from 'react';
import { motion, useScroll, useTransform, useSpring, stagger, useAnimate } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

// Animation de texte lettre par lettre
export const AnimatedText: React.FC<{
  text: string;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}> = ({ text, className = '', delay = 0, staggerDelay = 0.05 }) => {
  const letters = text.split('');
  
  return (
    <motion.div className={className}>
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            delay: delay + index * staggerDelay,
            duration: 0.3,
            ease: "easeOut"
          }}
          viewport={{ once: true }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </motion.div>
  );
};

// Animation de parallax pour les images
export const ParallaxImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  speed?: number;
}> = ({ src, alt, className = '', speed = 0.5 }) => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -100 * speed]);
  const ySpring = useSpring(y, { stiffness: 100, damping: 30 });

  return (
    <motion.img
      src={src}
      alt={alt}
      className={className}
      style={{ y: ySpring }}
    />
  );
};

// Animation de stagger pour les listes
export const StaggerList: React.FC<{
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}> = ({ children, className = '', staggerDelay = 0.1 }) => {
  const [scope, animate] = useAnimate();
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true });

  React.useEffect(() => {
    if (inView) {
      animate(scope.current, { opacity: [0, 1] }, { duration: 0.5 });
      animate(
        "li",
        { opacity: [0, 1], y: [20, 0] },
        { delay: stagger(staggerDelay), duration: 0.5 }
      );
    }
  }, [inView, animate, scope, staggerDelay]);

  return (
    <motion.ul ref={ref} className={className}>
      <div ref={scope}>
        {children}
      </div>
    </motion.ul>
  );
};

// Animation de compteur
export const AnimatedCounter: React.FC<{
  value: number;
  className?: string;
  duration?: number;
  delay?: number;
}> = ({ value, className = '', duration = 2, delay = 0 }) => {
  const [ref, inView] = useInView({ threshold: 0.1, triggerOnce: true });
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => {
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / (duration * 1000), 1);
          const currentCount = Math.floor(progress * value);
          
          setCount(currentCount);
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        
        animate();
      }, delay * 1000);

      return () => clearTimeout(timer);
    }
  }, [inView, value, duration, delay]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
    >
      {count}
    </motion.span>
  );
};

// Animation de gradient animé
export const AnimatedGradient: React.FC<{
  children: React.ReactNode;
  className?: string;
  colors?: string[];
}> = ({ children, className = '', colors = ['#f43f5e', '#8b5cf6', '#06b6d4'] }) => {
  return (
    <motion.div
      className={className}
      animate={{
        background: [
          `linear-gradient(45deg, ${colors[0]}, ${colors[1]})`,
          `linear-gradient(45deg, ${colors[1]}, ${colors[2]})`,
          `linear-gradient(45deg, ${colors[2]}, ${colors[0]})`,
        ]
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      {children}
    </motion.div>
  );
};

// Animation de hover avec effet de profondeur
export const HoverCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  scale?: number;
}> = ({ children, className = '', scale = 1.05 }) => {
  return (
    <motion.div
      className={className}
      whileHover={{ 
        scale,
        boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
        y: -5
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
    >
      {children}
    </motion.div>
  );
};
