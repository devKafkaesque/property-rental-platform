import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';

gsap.registerPlugin(ScrollTrigger);

// Background wave animation effect
export const useWaveAnimation = (containerRef: React.RefObject<HTMLDivElement>) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const waves = container.querySelectorAll('.wave');
    
    waves.forEach((wave, index) => {
      gsap.to(wave, {
        y: "random(-20, 20)",
        x: "random(-20, 20)",
        rotation: "random(-10, 10)",
        duration: "random(2, 4)",
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: index * 0.2,
      });
    });
  }, [containerRef]);
};

// Form field entrance animation
export const useFormFieldAnimation = (formRef: React.RefObject<HTMLFormElement>) => {
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const fields = form.querySelectorAll('.form-field');
    
    gsap.fromTo(
      fields,
      { 
        opacity: 0,
        x: -30,
        scale: 0.95
      },
      {
        opacity: 1,
        x: 0,
        scale: 1,
        duration: 0.5,
        stagger: 0.1,
        ease: "back.out(1.4)",
        scrollTrigger: {
          trigger: form,
          start: "top center+=100",
          toggleActions: "play none none reverse"
        }
      }
    );
  }, [formRef]);
};

// Success celebration animation
export const useSuccessAnimation = (elementRef: React.RefObject<HTMLElement>) => {
  const animate = () => {
    const element = elementRef.current;
    if (!element) return;

    // Create particles
    const particles = Array.from({ length: 20 }, (_, i) => {
      const particle = document.createElement('div');
      particle.className = 'success-particle';
      element.appendChild(particle);
      return particle;
    });

    // Animate each particle
    particles.forEach((particle, i) => {
      gsap.fromTo(
        particle,
        {
          opacity: 1,
          scale: 0,
          x: 0,
          y: 0,
          backgroundColor: 'var(--primary)',
        },
        {
          opacity: 0,
          scale: 1,
          x: `random(-100, 100)`,
          y: `random(-100, 100)`,
          duration: 'random(0.6, 1)',
          ease: 'power2.out',
          onComplete: () => particle.remove(),
        }
      );
    });

    // Scale animation on the success element
    gsap.fromTo(
      element,
      { scale: 0.8 },
      { 
        scale: 1,
        duration: 0.5,
        ease: "elastic.out(1, 0.5)"
      }
    );
  };

  return animate;
};

// Loading spinner animation
export const useLoadingAnimation = (spinnerRef: React.RefObject<HTMLDivElement>) => {
  useEffect(() => {
    const spinner = spinnerRef.current;
    if (!spinner) return;

    const dots = spinner.querySelectorAll('.loading-dot');
    
    gsap.to(dots, {
      scale: 1.5,
      opacity: 0.2,
      duration: 0.5,
      stagger: {
        each: 0.2,
        repeat: -1,
        yoyo: true
      },
      ease: "power2.inOut"
    });
  }, [spinnerRef]);
};

// Error shake animation
export const useErrorShakeAnimation = (elementRef: React.RefObject<HTMLElement>) => {
  return () => {
    const element = elementRef.current;
    if (!element) return;

    gsap.to(element, {
      x: [-10, 10, -8, 8, -5, 5, 0],
      duration: 0.5,
      ease: "power2.out"
    });
  };
};
