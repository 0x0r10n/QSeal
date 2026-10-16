import type { ReactNode } from 'react'
import { Reveal, RevealItem } from '@/components/ui/Reveal'
import { cn } from '@/lib/cn'

export function SectionHeader({
  index,
  eyebrow,
  title,
  lede,
  className,
  align = 'left',
  aside,
  titleId,
}: {
  index?: string
  eyebrow: string
  title: ReactNode
  lede?: ReactNode
  className?: string
  align?: 'left' | 'center'
  aside?: ReactNode
  titleId?: string
}) {
  return (
    <Reveal className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center', className)}>
      <RevealItem className={cn('eyebrow flex items-center gap-3', align === 'center' && 'justify-center')}>
        {index && <span className="text-steel-600">{index}</span>}
        <span className="h-px w-6 bg-steel-600" aria-hidden />
        {eyebrow}
        {aside}
      </RevealItem>
      <RevealItem>
        <h2 id={titleId} className="mt-6 text-[clamp(2rem,4.6vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-steel-50">
          {title}
        </h2>
      </RevealItem>
      {lede && (
        <RevealItem>
          <p className="mt-6 max-w-2xl text-[16.5px] leading-[1.65] text-steel-400 md:text-[17px]">{lede}</p>
        </RevealItem>
      )}
    </Reveal>
  )
}

export function Container({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={cn('mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-12', className)}>
      {children}
    </div>
  )
}
