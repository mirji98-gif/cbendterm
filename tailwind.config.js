/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // change_spec_v4_final.md Part 7. Fallback stack keeps the app usable
        // if the Google Fonts request is slow or blocked on mobile data.
        sans: ['"Instrument Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      spacing: {
        // 8px grid (change_spec_v4_final.md Part 7)
        '18': '4.5rem',
      },
      colors: {
        // change_spec_v4_final.md Part 7 design tokens. Brand accents stay
        // per-brand inline styles (src/data/brands.ts) since two different
        // values are needed; these are the shared, condition-and-brand-
        // invariant tokens.
        ink: '#1A1C1A',
        muted: '#6B6F6B',
        line: '#E3E5E2',
        surface: '#F2F3F1',
        card: '#FFFFFF',
      },
      borderColor: {
        'neutral-150': '#ececec',
      },
    },
  },
  plugins: [],
};
