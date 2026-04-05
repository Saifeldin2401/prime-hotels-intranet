import { vi } from 'vitest'

// Mock react-i18next
export const mockI18n = () => {
  vi.mock('react-i18next', () => ({
    useTranslation: () => ({
      t: (key: string, params?: Record<string, unknown>) => {
        if (params) {
          return Object.entries(params).reduce(
            (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
            key
          )
        }
        return key
      },
      i18n: {
        language: 'en',
        changeLanguage: vi.fn(),
        t: (key: string) => key,
      },
    }),
    Trans: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: {
      type: '3rdParty',
      init: vi.fn(),
    },
  }))
}

// Mock react-router-dom
export const mockRouter = () => {
  vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
      ...actual,
      useNavigate: () => vi.fn(),
      useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
      useParams: () => ({}),
      useSearchParams: () => [new URLSearchParams(), vi.fn()],
    }
  })
}

// Mock zustand stores
export const mockZustand = (storeName: string, state: Record<string, unknown>) => {
  vi.mock(`@/stores/${storeName}`, () => ({
    useStore: () => [state, vi.fn()],
    default: () => state,
  }))
}

// Mock framer-motion
export const mockFramerMotion = () => {
  vi.mock('framer-motion', () => ({
    motion: {
      div: 'div',
      span: 'span',
      button: 'button',
      a: 'a',
      ul: 'ul',
      li: 'li',
      nav: 'nav',
      header: 'header',
      main: 'main',
      aside: 'aside',
      footer: 'footer',
      section: 'section',
      article: 'article',
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      p: 'p',
      form: 'form',
      input: 'input',
      textarea: 'textarea',
      select: 'select',
      label: 'label',
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useAnimation: () => ({
      start: vi.fn(),
      stop: vi.fn(),
      set: vi.fn(),
    }),
    useInView: () => true,
  }))
}

// Mock sonner toast
export const mockSonner = () => {
  vi.mock('sonner', () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      promise: vi.fn(),
      dismiss: vi.fn(),
      loading: vi.fn(),
    },
    Toaster: () => null,
  }))
}

// Mock all common dependencies
export const mockCommonDependencies = () => {
  mockI18n()
  mockRouter()
  mockFramerMotion()
  mockSonner()
}
