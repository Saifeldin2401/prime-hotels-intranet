export interface Theme {
  colors: {
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    background: string
    foreground: string
    card: string
    cardForeground: string
    border: string
    input: string
    ring: string
    accent: string
    accentForeground: string
    destructive: string
    destructiveForeground: string
    muted: string
    mutedForeground: string
    popover: string
    popoverForeground: string
    success: string
    successForeground: string
    warning: string
    warningForeground: string
    info: string
    infoForeground: string
  }
  borderRadius: string
  fontFamily: {
    sans: string[]
    serif: string[]
    mono: string[]
  }
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
    '4xl': string
  }
  transitions: {
    fast: string
    normal: string
    slow: string
  }
}

export const lightTheme: Theme = {
  colors: {
    primary: 'hsl(222, 84%, 5%)',
    primaryForeground: 'hsl(210, 40%, 98%)',
    secondary: 'hsl(210, 40%, 96%)',
    secondaryForeground: 'hsl(222, 84%, 5%)',
    background: 'hsl(0, 0%, 100%)',
    foreground: 'hsl(222, 84%, 5%)',
    card: 'hsl(0, 0%, 100%)',
    cardForeground: 'hsl(222, 84%, 5%)',
    border: 'hsl(214, 32%, 91%)',
    input: 'hsl(214, 32%, 91%)',
    ring: 'hsl(222, 84%, 5%)',
    accent: 'hsl(210, 40%, 96%)',
    accentForeground: 'hsl(222, 84%, 5%)',
    destructive: 'hsl(0, 84%, 60%)',
    destructiveForeground: 'hsl(210, 40%, 98%)',
    muted: 'hsl(210, 40%, 96%)',
    mutedForeground: 'hsl(215, 16%, 47%)',
    popover: 'hsl(0, 0%, 100%)',
    popoverForeground: 'hsl(222, 84%, 5%)',
    success: 'hsl(142, 71%, 45%)',
    successForeground: 'hsl(142, 71%, 9%)',
    warning: 'hsl(38, 92%, 60%)',
    warningForeground: 'hsl(38, 92%, 9%)',
    info: 'hsl(199, 89%, 58%)',
    infoForeground: 'hsl(199, 89%, 9%)'
  },
  borderRadius: '0.5rem',
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Georgia', 'serif'],
    mono: ['JetBrains Mono', 'monospace']
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem'
  },
  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out'
  }
}

export const darkTheme: Theme = {
  colors: {
    primary: 'hsl(210, 40%, 98%)',
    primaryForeground: 'hsl(222, 84%, 5%)',
    secondary: 'hsl(217, 33%, 17%)',
    secondaryForeground: 'hsl(210, 40%, 98%)',
    background: 'hsl(222, 84%, 5%)',
    foreground: 'hsl(210, 40%, 98%)',
    card: 'hsl(222, 84%, 5%)',
    cardForeground: 'hsl(210, 40%, 98%)',
    border: 'hsl(217, 33%, 17%)',
    input: 'hsl(217, 33%, 17%)',
    ring: 'hsl(212, 83%, 65%)',
    accent: 'hsl(217, 33%, 17%)',
    accentForeground: 'hsl(210, 40%, 98%)',
    destructive: 'hsl(0, 63%, 31%)',
    destructiveForeground: 'hsl(210, 40%, 98%)',
    muted: 'hsl(217, 33%, 17%)',
    mutedForeground: 'hsl(215, 20%, 65%)',
    popover: 'hsl(222, 84%, 5%)',
    popoverForeground: 'hsl(210, 40%, 98%)',
    success: 'hsl(142, 71%, 25%)',
    successForeground: 'hsl(142, 71%, 95%)',
    warning: 'hsl(38, 92%, 30%)',
    warningForeground: 'hsl(38, 92%, 95%)',
    info: 'hsl(199, 89%, 48%)',
    infoForeground: 'hsl(199, 89%, 95%)'
  },
  borderRadius: '0.5rem',
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Georgia', 'serif'],
    mono: ['JetBrains Mono', 'monospace']
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem'
  },
  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out'
  }
}

export type ThemeMode = 'light' | 'dark' | 'system'

export function getTheme(mode: ThemeMode): Theme {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? darkTheme : lightTheme
  }
  return mode === 'dark' ? darkTheme : lightTheme
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  
  // Apply CSS custom properties
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })
  
  root.style.setProperty('--radius', theme.borderRadius)
  root.style.setProperty('--font-sans', theme.fontFamily.sans.join(', '))
  root.style.setProperty('--font-serif', theme.fontFamily.serif.join(', '))
  root.style.setProperty('--font-mono', theme.fontFamily.mono.join(', '))
  
  // Apply shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value)
  })
  
  // Apply spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value)
  })
  
  // Apply transitions
  Object.entries(theme.transitions).forEach(([key, value]) => {
    root.style.setProperty(`--transition-${key}`, value)
  })
}
