module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended'
  ],
  parserOptions: {
    ecmaFeatures: { jsx: true },
    sourceType: 'module'
  },
  settings: { react: { version: 'detect' } },
  rules: {
    'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true }],
    'complexity': ['error', 12],
    'max-depth': ['error', 4],
    'max-nested-callbacks': ['error', 3],
    'max-params': ['error', 5]
  },
  overrides: [
    { files: ['**/infra/migrations/**/*'], rules: { 'max-lines': 'off', 'max-lines-per-function': 'off' } }
  ]
};