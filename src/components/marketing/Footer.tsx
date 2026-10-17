import { Link } from 'react-router-dom'
import { Wordmark } from '@/components/brand/QEmblem'
import { XLogo } from '@/components/brand/XLogo'
import { getAppUrl } from '@/lib/domains'

const COLS: Array<{ title: string; links: Array<{ label: string; to: string; isApp?: boolean }> }> = [
  {
    title: 'Product',
    links: [
      { label: 'Launch App', to: '/app', isApp: true },
      { label: 'New request', to: '/app/new', isApp: true },
      { label: 'Verify a receipt', to: '/app/verify', isApp: true },
      { label: 'Model catalogue', to: '/app/models', isApp: true },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Technology', to: '/technology' },
      { label: 'Security', to: '/security' },
      { label: 'Documentation', to: '/docs' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-ink-1000">
      <div className="mx-auto grid max-w-[1400px] gap-14 px-5 py-16 sm:px-8 md:grid-cols-[1.3fr_repeat(2,1fr)] lg:px-12">
        <div>
          <Wordmark />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-steel-500">
            Private, verifiable AI inference for developers and autonomous agents.
          </p>
          <div className="mt-6">
            <a
              href="https://x.com/QRouter_"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Follow @QRouter_ on X (formerly Twitter)"
              className="group/x relative inline-flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-steel-400 backdrop-blur-sm transition-all duration-300 hover:border-white/25 hover:bg-white/[0.08] hover:text-white hover:shadow-[0_0_20px_-3px_rgba(255,255,255,0.15)] active:scale-95"
            >
              <XLogo size={14} className="transition-transform duration-300 group-hover/x:scale-110" />
            </a>
          </div>
        </div>
        {COLS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="eyebrow">{col.title}</h2>
            <ul className="mt-5 space-y-3">
              {col.links.map((l) => {
                const targetUrl = l.isApp ? getAppUrl(l.to) : l.to
                const isExternal = /^https?:\/\//i.test(targetUrl)

                return (
                  <li key={l.label}>
                    {isExternal ? (
                      <a
                        href={targetUrl}
                        className="text-sm text-steel-400 transition-colors hover:text-steel-50"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link to={targetUrl} className="text-sm text-steel-400 transition-colors hover:text-steel-50">
                        {l.label}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  )
}
