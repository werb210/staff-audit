module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: [],
  rules: {
    // Prevent duplicate component names
    'no-duplicate-imports': 'error',
    
    // Enforce consistent import patterns
    'import/no-duplicates': 'off', // Handled by no-duplicate-imports
    
    // Block legacy imports and duplicate security implementations
    'no-restricted-imports': ['error', {
      'paths': [
        { 'name': 'helmet', 'importNames': ['default'], 'message': 'Only import helmet in server/middleware/csp.ts' },
        { 'name': 'react-router-dom', 'message': 'Use wouter instead. react-router-dom is banned due to useNavigate() crashes.' }
      ],
      'patterns': [
        '*__pipeline_legacy*',
        '*__legacy*', 
        '*-old*',
        '**/api/*-old*',
        { 'group': ['server/security/*'], 'message': 'Legacy security dir is forbidden' }
      ]
    }],
    
    // Block direct CSP header setting
    'no-restricted-properties': [
      'error',
      { 'object': 'res', 'property': 'setHeader', 'message': 'Do not set CSP directly; use server/middleware/csp.ts' }
    ],
    
    // Custom rules for architectural governance
    '@typescript-eslint/no-unused-vars': ['error', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_' 
    }],
  },
  overrides: [
    {
      // Only this file may import helmet/contentSecurityPolicy
      files: ['server/middleware/csp.ts'],
      rules: {
        'no-restricted-imports': 'off',
        'no-restricted-properties': 'off'
      }
    },
    {
      // Block Twilio CDN strings outside canonical loader
      files: ['client/**/*.{ts,tsx,js,jsx}'],
      excludedFiles: ['client/src/comm/twilioLoader.ts'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: 'Literal[value=/sdk\\.twilio\\.com\\/js\\/client\\/v\\d+\\.\\d+\\/twilio\\.min\\.js/]',
            message: 'Load Twilio only via client/src/comm/twilioLoader.ts'
          }
        ]
      }
    },
    {
      // Only this file may render BrowserRouter
      files: ['client/src/app/Providers.tsx'],
      rules: {}
    },
    {
      files: ['**/*.tsx'],
      rules: {
        // Disallow BrowserRouter/HashRouter elsewhere
        'no-restricted-syntax': [
          'error',
          {
            selector: "JSXOpeningElement[name.name='BrowserRouter']",
            message: 'Use the global Provider; do not mount another BrowserRouter.'
          },
          {
            selector: "JSXOpeningElement[name.name='HashRouter']",
            message: 'Do not use HashRouter.'
          }
        ]
      }
    }
  ],
  settings: {
    'import/resolver': {
      'typescript': {
        'alwaysTryTypes': true,
        'project': './tsconfig.json'
      }
    }
  }
}