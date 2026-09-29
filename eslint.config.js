import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: [
      'dist/**',
      'dist-ssr/**',
      'node_modules/**',
      'src/tests/**',
      'src/tests_old/**',
      'scripts/**',
      'supabase/**',
      'tailwind.config.js',
      'docs/**',
      '**/*.cjs',
      '**/*.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-constant-binary-expression': 'warn',
      'no-constant-condition': 'warn',
      'no-control-regex': 'warn',
      'no-misleading-character-class': 'warn',
      'no-empty': 'warn',
      'prefer-const': 'warn',
    },
  },
]
