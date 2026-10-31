import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Split heavy vendors into their own chunks so the main bundle stays under the
// 500 kB warning threshold and the charts library only loads where it's used.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
});
