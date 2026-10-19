import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', '.astro', 'node_modules', 'public/data', 'spike', 'data', 'preview/out'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'Banned by ADR-017: use text nodes.' },
      ],
    },
  },
);
