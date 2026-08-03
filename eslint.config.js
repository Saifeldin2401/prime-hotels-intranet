import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    'node_modules',
    '.agent',
    '.claude',
    '.agents',
    '.cursor',
    '.codex',
    'supabase/functions',
    'supabase/migrations',
    // Local-only vendored UI templates (already git-ignored). Not application
    // code -- linting it produced 74 parse errors and drowned real findings.
    'scratch',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-control-regex': 'warn',
      'no-empty': 'warn',
      'no-useless-escape': 'warn',
      'prefer-const': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-refresh/only-export-components': 'warn',
      // Design-system guardrail: keep color out of source. Use tokens from src/index.css
      // (bg-primary, text-foreground, hsl(var(--hotel-gold)), etc.) so theming + dark mode work.
      'no-restricted-syntax': ['warn',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{6}\\b/]',
          message: 'Avoid hardcoded hex colors. Use a design token (bg-primary, text-foreground, hsl(var(--...))) — see src/index.css.',
        },
        {
          selector: 'TemplateElement[value.raw=/#[0-9a-fA-F]{6}\\b/]',
          message: 'Avoid hardcoded hex colors in template strings. Use a design token — see src/index.css.',
        },
      ],
    },
  },
  {
    // Allow hardcoded colors where they are legitimately data, not UI chrome:
    // decorative confetti, chart series palettes, and theme-token definitions.
    files: [
      'src/components/ui/HolidayCelebration.tsx',
      'src/lib/theme.ts',
      'src/**/*chart*.{ts,tsx}',
      'src/**/*Chart*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
])
