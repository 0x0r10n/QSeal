import { useEffect } from 'react'

const BASE = 'QRouter'
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} — Intelligence deserves privacy`
  }, [title])
}
