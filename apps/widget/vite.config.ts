import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        embed: 'src/embed.ts',
      },
      output: {
        entryFileNames: 'widget.js',
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
