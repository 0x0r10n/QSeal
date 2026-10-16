import { motion, type HTMLMotionProps } from 'motion/react'
import { fadeUp, stagger } from '@/lib/motion'

type Tag = 'div' | 'ol' | 'ul' | 'li'

/** Scroll-triggered reveal. `RevealItem` children stagger in with one shared curve. */
export function Reveal({
  children,
  gap = 0.08,
  delay = 0,
  amount = 0.2,
  as = 'div',
  ...rest
}: HTMLMotionProps<'div'> & { gap?: number; delay?: number; amount?: number; as?: Tag }) {
  const Comp = motion[as] as typeof motion.div
  return (
    <Comp initial="hidden" whileInView="show" viewport={{ once: true, amount }} variants={stagger(gap, delay)} {...rest}>
      {children}
    </Comp>
  )
}

export function RevealItem({ as = 'div', ...props }: HTMLMotionProps<'div'> & { as?: Tag }) {
  const Comp = motion[as] as typeof motion.div
  return <Comp variants={fadeUp} {...props} />
}
