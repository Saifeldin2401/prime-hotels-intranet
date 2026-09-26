/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  // Physical-direction utilities the codebase no longer uses (it now uses logical
  // ms-/ps-/start-/border-s-… classes so Arabic RTL mirrors correctly), kept only
  // because AI-generated lesson/article HTML already stored in the database still
  // references them and Tailwind would otherwise stop emitting their CSS.
  safelist: [
    '-mr-1', '-mr-2', '-right-2',
    'border-l', 'border-l-2', 'border-l-4', 'border-l-transparent', 'hover:border-l-primary',
    'border-l-amber-500', 'border-l-blue-500', 'border-l-emerald-500', 'border-l-green-500',
    'border-l-hotel-gold', 'border-l-hotel-navy', 'border-l-indigo-500', 'border-l-orange-500',
    'border-l-pink-500', 'border-l-purple-500', 'border-l-red-500', 'border-l-slate-300',
    'border-r-0', 'border-r-2', 'border-r-4', 'md:border-r',
    'left-0', 'left-1', 'left-2', 'left-2.5', 'left-3', 'left-5', 'sm:left-6',
    'right-0', 'right-1', 'right-2', 'right-3', 'right-5', 'sm:right-6',
    'ml-2', 'mr-1', 'mr-1.5', 'mr-2', 'pl-4', 'pl-6', 'pl-9', 'pr-1', 'pr-4', 'pr-9',
    'rounded-bl-xl', 'rounded-br-xl', 'rounded-l-md', 'rounded-r-md', 'sm:rounded-l-2xl', 'sm:rounded-r-2xl',
    'rounded-tl-none', 'rounded-tl-xl', 'rounded-tl-xs', 'rounded-tr-none', 'rounded-tr-xl', 'rounded-tr-xs',
    'text-left', 'text-right', 'sm:text-left',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        xs: "320px",
        sm: "375px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1400px",
      },
    },
    extend: {
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      minWidth: {
        'touch': '44px',
      },
      colors: {
        // Design-system palette (CSS variables in src/index.css, source: src/ui/tokens/colors.ts)
        ds: {
          'ink': 'rgb(var(--ds-ink) / <alpha-value>)',
          'ink-secondary': 'rgb(var(--ds-ink-secondary) / <alpha-value>)',
          'muted': 'rgb(var(--ds-muted) / <alpha-value>)',
          'background': 'rgb(var(--ds-background) / <alpha-value>)',
          'surface': 'rgb(var(--ds-surface) / <alpha-value>)',
          'surface-subtle': 'rgb(var(--ds-surface-subtle) / <alpha-value>)',
          'border': 'rgb(var(--ds-border) / <alpha-value>)',
          'border-strong': 'rgb(var(--ds-border-strong) / <alpha-value>)',
          'brass': 'rgb(var(--ds-brass) / <alpha-value>)',
          'accent': 'rgb(var(--ds-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--ds-accent-hover) / <alpha-value>)',
          'accent-soft': 'rgb(var(--ds-accent-soft) / <alpha-value>)',
          'success': 'rgb(var(--ds-success) / <alpha-value>)',
          'success-soft': 'rgb(var(--ds-success-soft) / <alpha-value>)',
          'warning': 'rgb(var(--ds-warning) / <alpha-value>)',
          'warning-soft': 'rgb(var(--ds-warning-soft) / <alpha-value>)',
          'danger': 'rgb(var(--ds-danger) / <alpha-value>)',
          'danger-soft': 'rgb(var(--ds-danger-soft) / <alpha-value>)',
          'info': 'rgb(var(--ds-info) / <alpha-value>)',
          'info-soft': 'rgb(var(--ds-info-soft) / <alpha-value>)',
          'on-ink': 'rgb(var(--ds-on-ink) / <alpha-value>)',
          'chrome': 'rgb(var(--ds-chrome) / <alpha-value>)',
          'chrome-raised': 'rgb(var(--ds-chrome-raised) / <alpha-value>)',
          'chrome-border': 'rgb(var(--ds-chrome-border) / <alpha-value>)',
          'chrome-text': 'rgb(var(--ds-chrome-text) / <alpha-value>)',
          'chrome-muted': 'rgb(var(--ds-chrome-muted) / <alpha-value>)',
          'chrome-accent': 'rgb(var(--ds-chrome-accent) / <alpha-value>)',
        },
        pc: {
          ink: 'var(--color-ink)',
          'ink-secondary': 'var(--color-ink-secondary)',
          muted: 'var(--color-muted)',
          background: 'var(--color-background)',
          surface: 'var(--color-surface)',
          'surface-subtle': 'var(--color-surface-subtle)',
          border: 'var(--color-border)',
          'border-strong': 'var(--color-border-strong)',
          accent: 'var(--color-accent)',
          'accent-hover': 'var(--color-accent-hover)',
          'accent-soft': 'var(--color-accent-soft)',
          brass: 'var(--color-accent)',
          success: 'var(--color-success)',
          'success-soft': 'var(--color-success-soft)',
          warning: 'var(--color-warning)',
          'warning-soft': 'var(--color-warning-soft)',
          danger: 'var(--color-danger)',
          'danger-soft': 'var(--color-danger-soft)',
          info: 'var(--color-info)',
          'info-soft': 'var(--color-info-soft)',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "border-accent": "hsl(var(--border-accent))",
        "focus-ring": "hsl(var(--focus-ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          active: "hsl(var(--primary-active))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        hotel: {
          gold: {
            DEFAULT: "hsl(var(--hotel-gold))",
            light: "hsl(var(--hotel-gold-light))",
            dark: "hsl(var(--hotel-gold-dark))",
          },
          navy: {
            DEFAULT: "hsl(var(--hotel-navy))",
            light: "hsl(var(--hotel-navy-light))",
            dark: "hsl(var(--hotel-navy-dark))",
          },
          cream: "hsl(var(--hotel-cream))",
          emerald: {
            DEFAULT: "hsl(var(--hotel-emerald))",
            light: "hsl(var(--hotel-emerald-light))",
          },
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        altus: {
          copper: {
            DEFAULT: "#C45B2F",
            light: "#D9774D",
            dark: "#A34720",
          },
          cream: "#F7F5F1",
          creamy: "#F7F5F1",
          ivory: "#FAF7F2",
          sand: {
            DEFAULT: "#D9C6A3",
            light: "#EADBCA",
            dark: "#C2AC85",
          },
          slate: {
            DEFAULT: "#5B6775",
            light: "#717E8E",
            dark: "#46505C",
          },
          charcoal: {
            DEFAULT: "#1E2329",
            light: "#2A2F35",
            dark: "#14171B",
          },
          "charcoal-alt": "#2A2F35",
          emerald: {
            DEFAULT: "#2E7D5A",
            light: "#3B9B71",
            dark: "#205B41",
          },
        },
      },
      fontFamily: {
        sans: ["DM Sans", "IBM Plex Sans Arabic", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        // Legacy aliases resolve to the interface face, so older screens do not
        // scatter the display face; Cormorant is opt-in via `font-editorial`.
        display: ["DM Sans", "IBM Plex Sans Arabic", "sans-serif"],
        executive: ["DM Sans", "IBM Plex Sans Arabic", "sans-serif"],
        serif: ["DM Sans", "IBM Plex Sans Arabic", "sans-serif"],
        editorial: ["Cormorant Garamond", "IBM Plex Sans Arabic", "Georgia", "serif"],
        mono: ["IBM Plex Mono", "Consolas", "Courier New", "monospace"],
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-apple': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out-smooth': 'cubic-bezier(0.77, 0, 0.175, 1)',
        'drawer': 'cubic-bezier(0.32, 0.72, 0, 1)',
        'spring-snappy': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "scale(0.98)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "fade-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.98)" },
        },
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(-8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.96)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "scale-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.96)", opacity: "0" },
        },
        "ken-burns": {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.05)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        "accordion-up": "accordion-up 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        "fade-in": "fade-in 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        "fade-out": "fade-out 150ms cubic-bezier(0.23, 1, 0.32, 1)",
        "slide-up": "slide-up 250ms cubic-bezier(0.23, 1, 0.32, 1)",
        "slide-down": "slide-down 250ms cubic-bezier(0.23, 1, 0.32, 1)",
        "scale-in": "scale-in 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        "scale-out": "scale-out 150ms cubic-bezier(0.23, 1, 0.32, 1)",
        "ken-burns": "ken-burns 20s cubic-bezier(0.23, 1, 0.32, 1) infinite alternate",
        "float": "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

