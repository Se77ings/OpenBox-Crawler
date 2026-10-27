// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['**/dist/**', '**/.output/**', '**/.wxt/**', '**/coverage/**'] },

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: { allowDefaultProject: ['*.js', '*.ts'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Os repositórios usam um driver síncrono (better-sqlite3), mas cumprem contratos
      // assíncronos do domain. Mantê-los async faz um erro virar uma Promise rejeitada,
      // em vez de uma exceção síncrona, mesmo sem nenhum await no corpo.
      '@typescript-eslint/require-await': 'off',
    },
  },

  // Fronteiras entre as camadas: a direção das dependências é parte da arquitetura.
  {
    files: ['src/**/*.ts', 'apps/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['src/*/tsconfig.json', 'apps/*/tsconfig.json'],
          noWarnOnMultipleProjects: true,
        },
      },
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/**', partialMatch: false },
        { type: 'application', pattern: 'src/application/**', partialMatch: false },
        { type: 'infra', pattern: 'src/infra/**', partialMatch: false },
        { type: 'api', pattern: 'apps/api/**', partialMatch: false },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            // Cada camada pode importar os próprios arquivos.
            {
              from: { element: { type: 'domain' } },
              allow: { to: { element: { type: 'domain' } } },
            },
            {
              from: { element: { type: 'application' } },
              allow: { to: { element: { types: { anyOf: ['application', 'domain'] } } } },
            },
            {
              from: { element: { type: 'infra' } },
              allow: { to: { element: { types: { anyOf: ['infra', 'domain'] } } } },
            },
            // A api é o composition root: conhece todas as camadas.
            {
              from: { element: { type: 'api' } },
              allow: {
                to: { element: { types: { anyOf: ['api', 'domain', 'application', 'infra'] } } },
              },
            },
            // Bibliotecas externas e módulos do Node são liberados.
            { allow: { to: { module: { origin: ['external', 'core'] } } } },
          ],
        },
      ],
    },
  },

  // Arquivos de configuração em JS ficam fora das regras que exigem tipagem.
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },

  prettier,
);
