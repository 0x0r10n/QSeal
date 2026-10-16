import { cn } from '@/lib/cn'

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type Size = 'sm' | 'md' | 'lg'

const base =
  'group/btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-[-0.01em] transition-[background,color,box-shadow,transform,border-color] duration-300 ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40'

const variants: Record<Variant, string> = {
  primary:
    'text-ink-950 bg-[linear-gradient(180deg,#ffffff,#cfd1d6)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.25),0_10px_30px_-12px_rgba(255,255,255,0.25)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(0,0,0,0.25),0_14px_40px_-12px_rgba(255,255,255,0.4)] overflow-hidden',
  secondary:
    'text-steel-50 border border-white/12 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 backdrop-blur-sm',
  ghost: 'text-steel-300 hover:text-steel-50 hover:bg-white/[0.05]',
  danger: 'text-bad border border-bad/25 bg-bad/[0.06] hover:bg-bad/[0.12]',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-[13px]',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-6 text-[15px]',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}
