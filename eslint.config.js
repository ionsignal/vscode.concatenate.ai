const parser = require('@typescript-eslint/parser')
const typescript = require('@typescript-eslint/eslint-plugin')

module.exports = [
  {
    ignores: ['node_modules/**', 'out/**', 'dist/**'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      semi: ['error', 'never'],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
]
