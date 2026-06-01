import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: resolve(__dirname, 'themes/ssarcandy/source/js'),
    emptyOutDir: false,
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