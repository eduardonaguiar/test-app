import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['dist'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tsParser,
      parserOptions: {
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='div'] > JSXAttribute[name.name='onClick']",
          message:
            'Evite onClick em div. Use um botão nativo ou componente semanticamente interativo com suporte a teclado.',
        },
        {
          selector: "JSXOpeningElement[name.name='span'] > JSXAttribute[name.name='onClick']",
          message:
            'Evite onClick em span. Use um botão nativo ou componente semanticamente interativo com suporte a teclado.',
        },
      ],
    },
  },
];
