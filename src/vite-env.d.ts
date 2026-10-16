/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QSEAL_API_URL?: string
  readonly VITE_QSEAL_API_TIMEOUT_MS?: string
  readonly VITE_QSEAL_DEV_MOCKS?: string
  readonly VITE_ROUTER?: 'browser' | 'hash'
}
