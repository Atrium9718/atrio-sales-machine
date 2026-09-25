import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['packages/**/*.{test,spec}.ts', 'server/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.tsx'],
    exclude: ['e2e/**', '**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@fusion/core': path.resolve(__dirname, './packages/core'),
      '@fusion/db': path.resolve(__dirname, './packages/db'),
      '@fusion/contracts': path.resolve(__dirname, './packages/contracts'),
      '@fusion/config': path.resolve(__dirname, './packages/config/src/env.ts'),
      '@fusion/jobs': path.resolve(__dirname, './packages/jobs'),
    },
  },
});
