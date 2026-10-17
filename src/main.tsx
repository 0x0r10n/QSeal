import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './styles/index.css'
import { Providers } from './app/providers'
import { prefetchRoutes, router } from './app/router'
import { readJSON, session, writeJSON } from './lib/storage'

const RELOADED = 'qrouter.chunkReloadAt'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)

window.addEventListener('load', prefetchRoutes, { once: true })

// After a redeploy, an open tab may ask for chunks that no longer exist. Reload to pick up the
// new build, at most once every 30 s so a genuinely missing file can't cause a reload loop.
window.addEventListener('vite:preloadError', (e) => {
  if (Date.now() - readJSON(session, RELOADED, 0) < 30_000) return
  writeJSON(session, RELOADED, Date.now())
  e.preventDefault()
  window.location.reload()
})
