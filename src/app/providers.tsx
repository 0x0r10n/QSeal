import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { Analytics } from '@vercel/analytics/react'
import { usePrefs } from '@/hooks/usePrefs'
import { ApiError } from '@/services/api/errors'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (count, err) => !(err instanceof ApiError && ['unconfigured', 'http', 'parse'].includes(err.kind)) && count < 1,
    },
  },
})

function Motion({ children }: { children: ReactNode }) {
  const { motion } = usePrefs()
  return (
    <MotionConfig reducedMotion={motion === 'system' ? 'user' : motion === 'reduced' ? 'always' : 'never'}>{children}</MotionConfig>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Motion>
        {children}
        <Analytics />
      </Motion>
    </QueryClientProvider>
  )
}
