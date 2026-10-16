import { motion } from 'motion/react'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

/** Isometric stack of machined plates — one per security layer. */
export function LayerStack({ count, active, labels }: { count: number; active: number; labels: string[] }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px] [perspective:1400px]" aria-hidden>
      <div className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(58deg)_rotateZ(-42deg)_translateZ(-60px)]">
        {Array.from({ length: count }).map((_, i) => {
          const isActive = i === active
          const z = (count - 1 - i) * 46
          return (
            <motion.div
              key={i}
              initial={false}
              animate={{ z: z + (isActive ? 34 : 0), opacity: isActive ? 1 : 0.55 }}
              transition={{ duration: 0.9, ease: EASE }}
              className={cn(
                'absolute inset-[14%] rounded-[22px] border',
                isActive
                  ? 'border-white/40 bg-[linear-gradient(135deg,#2c2d33,#121215_60%,#1e1f24)] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.25)]'
                  : 'border-white/10 bg-[linear-gradient(135deg,#17171b,#0c0c0e)]',
              )}
            >
              <div className="pinstripes absolute inset-0 rounded-[22px] opacity-70" />
              <span
                className={cn(
                  'absolute bottom-4 left-5 font-mono text-[10px] uppercase tracking-[0.16em]',
                  isActive ? 'text-steel-100' : 'text-steel-600',
                )}
              >
                0{i + 1} · {labels[i]}
              </span>
              {isActive && (
                <motion.span
                  layoutId="layer-glint"
                  className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
                />
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
