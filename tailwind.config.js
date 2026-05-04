/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:         'var(--color-primary)',
        'accent-cyan':   'var(--color-accent-cyan)',
        'accent-violet': 'var(--color-accent-violet)',
        'accent-green':  'var(--color-accent-green)',
        'accent-red':    'var(--color-accent-red)',
        surface:         'var(--color-surface)',
        'bg-app':        'var(--color-bg)',
      },
      boxShadow: {
        'glow-primary': 'var(--glow-primary)',
        'glow-cyan':    'var(--glow-cyan)',
        'glow-violet':  'var(--glow-violet)',
        'glow-green':   'var(--glow-green)',
      },
      borderRadius: {
        'theme-sm': 'var(--radius-sm)',
        'theme-md': 'var(--radius-md)',
        'theme-lg': 'var(--radius-lg)',
        'theme-xl': 'var(--radius-xl)',
      },
      backdropBlur: {
        'card': '20px',
      },
    },
  },
  plugins: [],
}