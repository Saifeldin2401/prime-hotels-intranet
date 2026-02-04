export default [
  {
    ignores: ['dist', '**/*.{ts,tsx}'],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
]
