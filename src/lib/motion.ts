import type { Transition, Variants } from 'motion/react'

/** One easing family for the whole product: long, decelerating, weighty. */
export const EASE = [0.16, 1, 0.3, 1] as const
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const

export const DURATION = { fast: 0.25, base: 0.6, slow: 1.1, cinematic: 1.6 } as const

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }
export const softSpring: Transition = { type: 'spring', stiffness: 120, damping: 22, mass: 1 }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: DURATION.slow, ease: EASE } },
}

export const stagger = (gap = 0.08, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
})
