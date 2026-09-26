import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const root = process.cwd();

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(root, './src'),
        '@fusion/core': path.resolve(root, './packages/core'),
        '@fusion/db': path.resolve(root, './packages/db'),
        '@fusion/contracts': path.resolve(root, './packages/contracts'),
        '@fusion/config': path.resolve(root, './packages/config/src/env.ts'),
        '@fusion/jobs': path.resolve(root, './packages/jobs'),
        '@fusion/ui': path.resolve(root, './packages/ui/src')
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
