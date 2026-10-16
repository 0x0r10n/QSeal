import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Wordmark } from '@/components/brand/QEmblem'

const COLS: Array<{ title: string; links: Array<{ label: string; to: string; external?: boolean }> }> = [
  {
    title: 'Product',
    links: [
      { label: 'Launch App', to: '/app' },
      { label: 'New request', to: '/app/new' },
      { label: 'Verify a receipt', to: '/app/verify' },
      { label: 'Model catalogue', to: '/app/models' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Technology', to: '/technology' },
      { label: 'Security', to: '/security' },
      { label: 'Documentation', to: '/docs' },
      { label: 'Sign In', to: '/sign-in' },
    ],
  },
  {
    title: 'Standards',
    links: [
      { label: 'NIST Post-Quantum Cryptography', to: 'https://csrc.nist.gov/projects/post-quantum-cryptography', external: true },
      { label: 'FIPS 203 · ML-KEM', to: 'https://csrc.nist.gov/pubs/fips/203/final', external: true },
      { label: 'FIPS 204 · ML-DSA', to: 'https://csrc.nist.gov/pubs/fips/204/final', external: true },
      { label: 'Solana documentation', to: 'https://solana.com/docs', external: true },
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-ink-1000">
      <div className="mx-auto grid max-w-[1400px] gap-14 px-5 py-16 sm:px-8 md:grid-cols-[1.3fr_repeat(3,1fr)] lg:px-12">
        <div>
          <Wordmark />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-steel-500">
            Private, verifiable AI inference for developers and autonomous agents.
          </p>
        </div>
        {COLS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="eyebrow">{col.title}</h2>
            <ul className="mt-5 space-y-3">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a
                      href={l.to}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group inline-flex items-center gap-1 text-sm text-steel-400 transition-colors hover:text-steel-50"
                    >
                      {l.label}
                      <ArrowUpRight className="size-3 opacity-50 transition group-hover:opacity-100" />
                    </a>
                  ) : (
                    <Link to={l.to} className="text-sm text-steel-400 transition-colors hover:text-steel-50">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 border-t border-white/[0.05] px-5 py-6 text-xs text-steel-600 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>© {new Date().getFullYear()} QSeal.</p>
        <p>Privacy policy and terms of service are published with the production deployment.</p>
      </div>
    </footer>
  )
}
