import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'vendor-three';
          }
          if (id.includes('node_modules/trystero') || id.includes('node_modules/peerjs')) {
            return 'vendor-network';
          }
        }
      }
    }
  },
  worker: {
    format: 'es'
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
