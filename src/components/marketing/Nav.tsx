import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Wordmark } from '@/components/brand/QEmblem'
import { ButtonLink } from '@/components/ui/Button'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

const LINKS = [
  { to: '/#product', label: 'Product' },
  { to: '/technology', label: 'Technology' },
  { to: '/security', label: 'Security' },
  { to: '/docs', label: 'Documentation' },
]

export function Nav() {
  const { scrollY } = useScroll()
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useMotionValueEvent(scrollY, 'change', (v) => setSolid(v > 24))

  useEffect(() => setOpen(false), [location.pathname, location.hash])
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : ''
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: EASE, delay: 0.05 }}
        className={cn(
          'border-b transition-[background,border-color,backdrop-filter] duration-500',
          solid || open
            ? 'border-white/[0.06] bg-ink-950/75 backdrop-blur-xl backdrop-saturate-150'
            : 'border-transparent bg-transparent',
        )}
      >
        <nav aria-label="Primary" className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-5 sm:px-8 lg:px-12">
          <Link to="/" aria-label="QSeal home" className="rounded-md">
            <Wordmark />
          </Link>

          <ul className="ml-6 hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  className={({ isActive }) =>
                    cn(
                      'relative rounded-full px-3.5 py-2 text-[13.5px] transition-colors',
                      isActive && !l.to.includes('#') ? 'text-steel-50' : 'text-steel-400 hover:text-steel-50',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {l.label}
                      {isActive && !l.to.includes('#') && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-x-3.5 -bottom-[13px] h-px bg-steel-100"
                          transition={{ duration: 0.5, ease: EASE }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/sign-in"
              className="hidden rounded-full px-3.5 py-2 text-[13.5px] text-steel-300 transition-colors hover:text-steel-50 sm:inline-flex"
            >
              Sign In
            </Link>
            <span className="hidden sm:block">
              <ButtonLink to="/app" size="sm" className="h-9 px-4">
                Launch App <ArrowRight className="size-3.5" />
              </ButtonLink>
            </span>
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((o) => !o)}
              className="grid size-10 place-items-center rounded-full border border-white/10 text-steel-100 md:hidden"
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </nav>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 top-16 z-40 flex flex-col bg-ink-950/97 px-5 pb-10 pt-6 backdrop-blur-xl md:hidden"
          >
            <ul className="flex flex-col">
              {[...LINKS, { to: '/sign-in', label: 'Sign In' }].map((l, i) => (
                <motion.li
                  key={l.to}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.04 * i }}
                  className="border-b border-white/[0.07]"
                >
                  <Link to={l.to} className="flex items-center justify-between py-5 text-2xl font-medium tracking-[-0.03em] text-steel-50">
                    {l.label}
                    <ArrowRight className="size-5 text-steel-500" />
                  </Link>
                </motion.li>
              ))}
            </ul>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.25 }}
              className="mt-auto"
            >
              <ButtonLink to="/app" size="lg" className="w-full">
                Launch App <ArrowRight className="size-4" />
              </ButtonLink>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
