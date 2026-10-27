import { defineConfig } from 'tsup';

// A api é o único executável do back-end: as camadas (@obc/*) entram no bundle, como
// Class Libraries dentro do executável; as bibliotecas de terceiros continuam externas.
export default defineConfig({
  entry: ['src/main.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node24',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@obc\//],
});
