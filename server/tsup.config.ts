import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'server/src/index.ts',
    'server/src/db/_emit.ts'
  ],
  outDir: 'server/dist',
  format: ['cjs'],
  target: 'node20',
  sourcemap: false,
  clean: true
});
