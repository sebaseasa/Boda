import { defineConfig } from 'vite';

// En GitHub Pages el sitio vive en https://sebaseasa.github.io/Boda/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Boda/' : '/',
  build: { target: 'es2020', chunkSizeWarningLimit: 1500 },
}));
