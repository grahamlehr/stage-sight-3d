import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import pkg from './package.json';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // Lets the About panel show the package.json version without hardcoding it
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  // Tailwind runs as a Vite plugin, so no PostCSS config is needed. The inline
  // empty one stops Vite searching parent folders and picking up a stale config
  // (git worktrees live inside the main checkout).
  css: {
    postcss: {}
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  build: {
    target: 'esnext'
  }
});
