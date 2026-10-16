import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

import { buttonClass, type Variant, type Size } from './buttonStyles'

function Sheen({ variant }: { variant: Variant }) {
  if (variant !== 'primary') return null
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,0.85)_50%,transparent_70%)] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover/btn:translate-x-full"
    />
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...rest}>
      <Sheen variant={variant} />
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </button>
  )
})

interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
  children: ReactNode
}

export function ButtonLink({ variant = 'primary', size = 'md', className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, typeof className === 'string' ? className : undefined)} {...rest}>
      <Sheen variant={variant} />
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </Link>
  )
}
