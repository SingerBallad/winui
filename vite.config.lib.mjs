import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'index.ts',
      formats: ['es'],
      fileName: () => 'winui.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
    minify: 'esbuild',
    reportCompressedSize: true,
  },
});
