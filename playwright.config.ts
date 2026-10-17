import { defineConfig, devices } from '@playwright/test'

/**
 * Two front ends are served:
 *  - :4173 — a build with no backend configured (marketing + unconfigured app)
 *  - :4174 — a build wired to a real development gateway on :4021 (live journeys)
 */
const OFFLINE = 4173
const LIVE = 4174
const GATEWAY = 4021

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /live\.spec/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: `http://localhost:${OFFLINE}` },
    },
    { name: 'mobile', testIgnore: /live\.spec/, use: { ...devices['Pixel 7'], baseURL: `http://localhost:${OFFLINE}` } },
    {
      name: 'live',
      testMatch: /live\.spec/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 }, baseURL: `http://localhost:${LIVE}` },
    },
  ],
  webServer: [
    {
      command: `npm run build && npx vite preview --port ${OFFLINE} --strictPort`,
      url: `http://localhost:${OFFLINE}`,
      reuseExistingServer: true,
      timeout: 240_000,
    },
    {
      // Development mode: free test keys and simulated payments. Fresh in-memory state per run.
      command: 'npx tsx src/server.ts',
      cwd: 'backend',
      env: {
        ALLOW_DEV_BYPASS: 'true',
        PORT: String(GATEWAY),
        DATABASE_PATH: ':memory:',
        PQC_KEYS_FILE: '../test-results/e2e-gateway-keys.json',
        RATE_LIMIT_MAX: '1000',
      },
      url: `http://localhost:${GATEWAY}/health`,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: `npx vite build --outDir dist-live --emptyOutDir && npx vite preview --outDir dist-live --port ${LIVE} --strictPort`,
      env: { VITE_QSEAL_API_URL: `http://localhost:${GATEWAY}` },
      url: `http://localhost:${LIVE}`,
      reuseExistingServer: true,
      timeout: 240_000,
    },
  ],
})
