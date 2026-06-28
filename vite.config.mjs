import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: resolve(__dirname, 'themes/ssarcandy/source/js'),
    emptyOutDir: false,
    // The lazy MapLibre GL chunk (chunk-PhotographyMap) is ~845 KB — that's the
    // mapping engine itself, intentionally code-split off the critical path and
    // only fetched on idle / when the map view opens. Raise the warning threshold
    // so this expected vendor chunk doesn't trip Vite's default 500 KB notice.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'themes/ssarcandy/js/App.js'),
        projectPage: resolve(__dirname, 'themes/ssarcandy/js/ProjectPage.js'),
        photography: resolve(__dirname, 'themes/ssarcandy/js/Photography.js'),
      },
      output: {
        entryFileNames: '[name].bundle.js',
        chunkFileNames: 'chunk-[name]-[hash].js',
        assetFileNames: 'asset-[name]-[hash][extname]',
      }
    }
  }
});