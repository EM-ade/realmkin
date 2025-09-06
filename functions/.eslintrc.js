module.exports = {
  env: {
    node: true,
    es2021: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'script' // Use 'script' for CommonJS
  },
  rules: {
    // Allow require() imports for Firebase Functions
    '@typescript-eslint/no-require-imports': 'off',
    'no-undef': 'off'
  }
};
