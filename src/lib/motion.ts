import type { Transition } from 'framer-motion';

/** Snappy spring for layout changes (list reorders, indicators). */
export const layoutSpring: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 42,
  mass: 0.8,
};

/** Slightly softer spring for the side-peek panel and mobile drawer. */
export const panelSpring: Transition = {
  type: 'spring',
  stiffness: 360,
  damping: 36,
  mass: 0.9,
};

/** Quick ease-out for fades. */
export const fade: Transition = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
};
