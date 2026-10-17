import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: '0.0.0.0', port: 5173 },
  // Lazily imported at request time; pre-bundle so the dev server never reloads mid-request.
  optimizeDeps: { include: ['@noble/post-quantum/ml-kem', '@noble/post-quantum/ml-dsa', '@noble/curves/ed25519', '@wallet-standard/app', 'three', '@react-three/fiber', '@react-three/drei', '@solana/web3.js'] },
  preview: { host: '0.0.0.0', port: 4173 },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
