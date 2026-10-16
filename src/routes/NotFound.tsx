import { ButtonLink } from '@/components/ui/Button'
import { QEmblem } from '@/components/brand/QEmblem'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Not found')
  return (
    <section className="flex min-h-[80svh] flex-col items-center justify-center px-5 pt-24 text-center">
      <QEmblem className="h-20 w-auto opacity-60" />
      <p className="eyebrow mt-10">404</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-steel-50">This page isn’t sealed here.</h1>
      <p className="mt-3 text-steel-400">The address may be mistyped, or the page may have moved.</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink to="/">Home</ButtonLink>
        <ButtonLink to="/app" variant="secondary">Launch App</ButtonLink>
      </div>
    </section>
  )
}
