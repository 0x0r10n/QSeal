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

interface ButtonLinkProps extends Omit<LinkProps, 'to'> {
  to: string
  variant?: Variant
  size?: Size
  children: ReactNode
}

export function ButtonLink({ variant = 'primary', size = 'md', className, children, to, ...rest }: ButtonLinkProps) {
  const isExternal = typeof to === 'string' && /^https?:\/\//i.test(to)
  const classes = buttonClass(variant, size, typeof className === 'string' ? className : undefined)

  if (isExternal) {
    return (
      <a href={to} className={classes} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        <Sheen variant={variant} />
        <span className="relative inline-flex items-center gap-2">{children}</span>
      </a>
    )
  }

  return (
    <Link to={to} className={classes} {...rest}>
      <Sheen variant={variant} />
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </Link>
  )
}
