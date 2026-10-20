import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  // Lets the About panel show the package.json version without hardcoding it
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  build: {
    target: 'esnext'
  }
});
