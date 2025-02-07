import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist', // Output directory for the built files
    rollupOptions: {
      input: 'index.html', // Entry point for your app
    },
  },
});