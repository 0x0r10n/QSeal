import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { QEmblem } from '@/components/brand/QEmblem'
import { EASE } from '@/lib/motion'

export function PageHero({ eyebrow, title, lede, children }: { eyebrow: string; title: ReactNode; lede: ReactNode; children?: ReactNode }) {
  return (
    <section className="grain relative isolate overflow-hidden border-b border-white/[0.05] pb-20 pt-36 md:pb-28 md:pt-48">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_80%_at_85%_0%,#1a1a1f,#060607_65%)]" />
      <div aria-hidden className="pinstripes mask-fade-b absolute inset-0 -z-10" />
      <motion.div
        aria-hidden
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 0.22, x: 0 }}
        transition={{ duration: 1.6, ease: EASE }}
        className="absolute -right-24 top-16 -z-10 hidden md:block"
      >
        <QEmblem className="h-[420px] w-auto" />
      </motion.div>
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="eyebrow flex items-center gap-3"
        >
          <span className="h-px w-8 bg-steel-500" /> {eyebrow}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.2, ease: EASE, delay: 0.08 }}
          className="mt-6 max-w-4xl text-[clamp(2.5rem,7vw,5.25rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-steel-50"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.22 }}
          className="mt-7 max-w-2xl text-[17px] leading-[1.65] text-steel-400 md:text-lg"
        >
          {lede}
        </motion.p>
        {children && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.4 }} className="mt-10">
            {children}
          </motion.div>
        )}
      </div>
    </section>
  )
}

export function Prose({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid gap-6 border-t border-white/[0.07] py-14 md:grid-cols-[0.8fr_1.4fr] md:gap-16 md:py-20">
      <div>
        <h2 className="text-2xl font-medium tracking-[-0.03em] text-steel-50 md:text-[28px]">{title}</h2>
        {aside && <div className="mt-4">{aside}</div>}
      </div>
      <div className="space-y-5 text-[16px] leading-[1.75] text-steel-400">{children}</div>
    </div>
  )
}
