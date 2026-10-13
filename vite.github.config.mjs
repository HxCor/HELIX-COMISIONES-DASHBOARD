import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/HELIX-COMISIONES-DASHBOARD/',
  publicDir: false,
  build: { outDir: 'dist-github' },
  optimizeDeps: { include: ['react', 'react-dom/client'] },
  plugins: [react()],
});
