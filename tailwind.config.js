/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        // ── Couleurs primaires ──
        primary:            'var(--color-primary)',

        // ── Accents ──
        'accent-cyan':      'var(--color-accent-cyan)',
        'accent-violet':    'var(--color-accent-violet)',
        'accent-green':     'var(--color-accent-green)',
        'accent-red':       'var(--color-accent-red)',
        'accent-orange':    'var(--color-accent-orange)',
        'accent-amber':     'var(--color-accent-amber)',
        'accent-fuchsia':   'var(--color-accent-fuchsia)',

        // ── Surfaces ──
        surface:            'var(--color-surface)',
        'surface-hover':    'var(--color-surface-hover)',
        'surface-2':        'var(--color-surface-2)',
        'surface-offset':   'var(--color-surface-offset)',
        'bg-app':           'var(--color-bg)',
        'bg-input':         'var(--color-bg-input)',
        field:              'var(--color-field)',

        // ── Texte ──
        'color-text':       'var(--color-text)',
        'text-muted':       'var(--color-text-muted)',
        'text-dim':         'var(--color-text-dim)',
        'text-faint':       'var(--color-text-faint)',

        // ── Bordures ──
        border:             'var(--color-border)',
        'border-primary':   'var(--color-border-primary)',
        'border-cyan':      'var(--color-border-cyan)',
        'border-violet':    'var(--color-border-violet)',
        'border-green':     'var(--color-border-green)',
        'border-neutral':   'var(--color-border-neutral)',
        divider:            'var(--color-divider)',

        // ── États fonctionnels ──
        success:            'var(--color-success)',
        error:              'var(--color-error)',
        warning:            'var(--color-warning)',
        info:               'var(--color-info)',
        danger:             'var(--color-danger)',

        // ── Overlays ──
        overlay:            'var(--color-overlay)',
        'overlay-light':    'var(--color-overlay-light)',

        // ── Tables ──
        'table-header':     'var(--color-table-header)',
        'table-row-alt':    'var(--color-table-row-alt)',
        'table-row-hover':  'var(--color-table-row-hover)',

        // ── Skeleton ──
        'skeleton-base':    'var(--color-skeleton-base)',
        'skeleton-shimmer': 'var(--color-skeleton-shimmer)',

        // ── Charts ──
        'chart-tooltip-bg':     'var(--color-chart-tooltip-bg)',
        'chart-tooltip-border': 'var(--color-chart-tooltip-border)',
        'chart-tooltip-title':  'var(--color-chart-tooltip-title)',
        'chart-axis-text':      'var(--color-chart-axis-text)',
        'chart-grid':           'var(--color-chart-grid)',

        // ── Scrollbars ──
        'scrollbar-track':  'var(--color-scrollbar-track)',
        'scrollbar-thumb':  'var(--color-scrollbar-thumb)',

        // ── Badges fonctionnels ──
        'badge-success-bg': 'var(--color-badge-success-bg)',
        'badge-warning-bg': 'var(--color-badge-warning-bg)',
        'badge-danger-bg':  'var(--color-badge-danger-bg)',
        'badge-info-bg':    'var(--color-badge-info-bg)',
      },
      boxShadow: {
        'glow-primary': 'var(--glow-primary)',
        'glow-cyan':    'var(--glow-cyan)',
        'glow-violet':  'var(--glow-violet)',
        'glow-green':   'var(--glow-green)',
        'glow-fuchsia': 'var(--glow-fuchsia)',
        'modal':        'var(--shadow-modal)',
      },
      borderRadius: {
        'theme-sm':  'var(--radius-sm)',
        'theme-md':  'var(--radius-md)',
        'theme-lg':  'var(--radius-lg)',
        'theme-xl':  'var(--radius-xl)',
        'theme-xxl': 'var(--radius-xxl)',
        'theme-pill':'var(--radius-pill)',
      },
      backdropBlur: {
        'card':    '16px',
        'modal':   '24px',
        'overlay': '8px',
      },
    },
  },
  plugins: [],
}