import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Fade in animation for elements
export const useFadeIn = (element: React.RefObject<HTMLElement>, delay = 0) => {
  useEffect(() => {
    const el = element.current;
    if (!el) return;

    gsap.fromTo(
      el,
      { 
        opacity: 0, 
        y: 50 
      },
      { 
        opacity: 1, 
        y: 0, 
        duration: 1, 
        delay,
        ease: "power3.out"
      }
    );
  }, [element, delay]);
};

// Stagger animation for lists
export const useStaggerAnimation = (containerRef: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = container.children;
    
    gsap.fromTo(
      elements,
      { 
        opacity: 0, 
        y: 30 
      },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: container,
          start: "top bottom-=100",
          toggleActions: "play none none reverse"
        }
      }
    );
  }, [containerRef]);
};

// Hover animation for property cards
export const usePropertyCardAnimation = (cardRef: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const image = card.querySelector('.property-image');
    const content = card.querySelector('.property-content');

    const timeline = gsap.timeline({ paused: true });
    
    timeline
      .to(card, { 
        y: -10, 
        scale: 1.02,
        duration: 0.3,
        ease: "power2.out"
      })
      .to(image, {
        scale: 1.1,
        duration: 0.3,
        ease: "power2.out"
      }, 0)
      .to(content, {
        y: -5,
        duration: 0.3,
        ease: "power2.out"
      }, 0);

    card.addEventListener('mouseenter', () => timeline.play());
    card.addEventListener('mouseleave', () => timeline.reverse());

    return () => {
      card.removeEventListener('mouseenter', () => timeline.play());
      card.removeEventListener('mouseleave', () => timeline.reverse());
    };
  }, [cardRef]);
};

// Page transition animation
export const usePageTransition = () => {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    gsap.fromTo(
      page,
      { 
        opacity: 0,
        x: 20
      },
      {
        opacity: 1,
        x: 0,
        duration: 0.6,
        ease: "power2.out"
      }
    );
  }, []);

  return pageRef;
};
