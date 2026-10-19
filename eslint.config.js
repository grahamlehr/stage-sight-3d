import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // Classic rules-of-hooks + exhaustive-deps (stale closures in effects are
      // the main class of bug this codebase is prone to), plus the React
      // Compiler-derived rules such as reading refs during render.
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    // three.js objects (cameras, textures, meshes) are mutated imperatively by
    // design — that is how the renderer is driven, including values obtained
    // from hooks like useThree() and useMemo(). The immutability rule assumes
    // React-owned data, so it only produces false positives in the 3D scene.
    files: ['src/components/canvas/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
]);
