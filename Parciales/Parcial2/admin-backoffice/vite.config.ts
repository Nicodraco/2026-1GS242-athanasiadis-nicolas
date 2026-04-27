import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envDir: '..',
  envPrefix: ['VITE_', 'REACT_PUBLIC_', 'NEXT_PUBLIC_'],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})
