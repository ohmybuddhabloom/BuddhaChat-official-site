import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: '/masters/',
  plugins: [
    { name: 'masters-public-runtime', enforce: 'pre', resolveId(source, importer) {
      if (source === './mobile' && importer?.endsWith('/src/Prototype.tsx')) return fileURLToPath(new URL('./src/public-runtime.tsx', import.meta.url));
    } },
    react(),
  ],
  build: { outDir: 'dist-public', rollupOptions: { input: 'public-web.html' } },
});
