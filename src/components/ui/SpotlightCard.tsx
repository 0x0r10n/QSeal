import { useRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/** A machined surface with a soft light that follows the pointer. */
export function SpotlightCard({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current
        if (!el) return
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - r.left}px`)
        el.style.setProperty('--my', `${e.clientY - r.top}px`)
      }}
      className={cn(
        'surface group/spot relative overflow-hidden rounded-3xl',
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-500 before:content-[''] before:[background:radial-gradient(420px_circle_at_var(--mx)_var(--my),rgba(255,255,255,0.06),transparent_60%)] hover:before:opacity-100",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
