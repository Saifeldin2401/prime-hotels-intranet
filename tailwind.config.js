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
        display: ["Canela", "Playfair Display", "Georgia", "serif"],
        executive: ["Neue Haas Grotesk", "Plus Jakarta Sans", "Inter", "sans-serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["IBM Plex Mono", "Consolas", "Courier New", "monospace"],
        serif: ["Canela", "Playfair Display", "Georgia", "serif"],
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
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

