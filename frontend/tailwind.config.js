/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Material 3 Tonal Palette (Dark/Light responsive)
        md3: {
          primary: 'rgb(var(--md-primary) / <alpha-value>)',
          'on-primary': 'rgb(var(--md-on-primary) / <alpha-value>)',
          'primary-container': 'rgb(var(--md-primary-container) / <alpha-value>)',
          'on-primary-container': 'rgb(var(--md-on-primary-container) / <alpha-value>)',
          
          secondary: 'rgb(var(--md-secondary) / <alpha-value>)',
          'on-secondary': 'rgb(var(--md-on-secondary) / <alpha-value>)',
          'secondary-container': 'rgb(var(--md-secondary-container) / <alpha-value>)',
          'on-secondary-container': 'rgb(var(--md-on-secondary-container) / <alpha-value>)',
          
          surface: 'rgb(var(--md-surface) / <alpha-value>)',
          'surface-dim': 'rgb(var(--md-surface-dim) / <alpha-value>)',
          'surface-bright': 'rgb(var(--md-surface-bright) / <alpha-value>)',
          'surface-container-lowest': 'rgb(var(--md-surface-container-lowest) / <alpha-value>)',
          'surface-container-low': 'rgb(var(--md-surface-container-low) / <alpha-value>)',
          'surface-container': 'rgb(var(--md-surface-container) / <alpha-value>)',
          'surface-container-high': 'rgb(var(--md-surface-container-high) / <alpha-value>)',
          'surface-container-highest': 'rgb(var(--md-surface-container-highest) / <alpha-value>)',
          
          'on-surface': 'rgb(var(--md-on-surface) / <alpha-value>)',
          'on-surface-variant': 'rgb(var(--md-on-surface-variant) / <alpha-value>)',
          outline: 'rgb(var(--md-outline) / <alpha-value>)',
          'outline-variant': 'rgb(var(--md-outline-variant) / <alpha-value>)',
          
          error: 'rgb(var(--md-error) / <alpha-value>)',
          'on-error': 'rgb(var(--md-on-error) / <alpha-value>)',
          'error-container': 'rgb(var(--md-error-container) / <alpha-value>)',
          'on-error-container': 'rgb(var(--md-on-error-container) / <alpha-value>)',
        },
      },
      borderRadius: {
        'md3-sm': '8px',
        'md3-md': '12px',
        'md3-lg': '16px',
        'md3-xl': '28px',
        'md3-full': '9999px',
      },
      boxShadow: {
        'md3-1': '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
        'md3-2': '0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
        'md3-3': '0px 1px 3px 0px rgba(0, 0, 0, 0.30), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
        'md3-4': '0px 2px 3px 0px rgba(0, 0, 0, 0.30), 0px 6px 10px 4px rgba(0, 0, 0, 0.15)',
        'md3-5': '0px 4px 4px 0px rgba(0, 0, 0, 0.30), 0px 8px 12px 6px rgba(0, 0, 0, 0.15)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          'Inter',
          'Roboto',
          'system-ui',
          '-system-ui',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          '"JetBrains Mono"',
          '"Fira Code"',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
