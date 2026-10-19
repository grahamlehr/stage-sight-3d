/** @type {import('tailwindcss').Config} */

// Colors, type and corners follow the CueSmith design language (Modernist,
// Backstage dark theme). The palette replaces Tailwind's defaults on purpose so
// stray zinc/cyan utilities fail to build into anything. Values live as RGB
// channels in src/index.css so opacity modifiers like `border-ink/20` work.
const channel = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#000000',
      white: '#ffffff',
      ground: channel('ground'),
      surface: channel('surface'),
      ink: channel('ink'),
      // One red means now: only the live state (VR session, live feed, slide on screen).
      accent: {
        DEFAULT: channel('accent'),
        400: channel('accent-400'),
        600: channel('accent-600'),
        700: channel('accent-700'),
      },
      // Armed / up-next states, CueSmith's standby fill.
      standby: channel('standby'),
      // Health signals only: sightline pass and marginal.
      signal: {
        go: channel('signal-go'),
        warn: channel('signal-warn'),
        'warn-fg': channel('signal-warn-fg'),
      },
    },
    borderRadius: {
      none: '0',
      DEFAULT: '0',
      full: '9999px',
    },
    fontFamily: {
      sans: ['Archivo', 'system-ui', 'sans-serif'],
    },
    fontWeight: {
      normal: '400',
      semibold: '600',
      extrabold: '800',
    },
    extend: {},
  },
  plugins: [],
}
