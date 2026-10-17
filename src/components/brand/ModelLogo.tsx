import { Boxes } from 'lucide-react'
import metaLogo from '@/assets/models/meta.svg'
import deepseekLogo from '@/assets/models/deepseek.svg'
import { VENDOR_NAME, type ModelVendor } from '@/content/models'
import { cn } from '@/lib/cn'

const LOGOS: Record<ModelVendor, string> = { meta: metaLogo, deepseek: deepseekLogo }

const isVendor = (v: string | undefined): v is ModelVendor => v === 'meta' || v === 'deepseek'

/** The model vendor's logo on a small machined tile. Unknown vendors get a neutral glyph. */
export function ModelLogo({ vendor, size = 'md', className }: { vendor?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const box = { sm: 'size-6 rounded-md', md: 'size-9 rounded-lg', lg: 'size-12 rounded-xl' }[size]
  const img = { sm: 'size-3.5', md: 'size-5', lg: 'size-7' }[size]
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))]',
        box,
        className,
      )}
    >
      {isVendor(vendor) ? (
        <img src={LOGOS[vendor]} alt={VENDOR_NAME[vendor]} className={img} draggable={false} />
      ) : (
        <Boxes className={cn(img, 'text-steel-400')} strokeWidth={1.6} aria-hidden />
      )}
    </span>
  )
}
