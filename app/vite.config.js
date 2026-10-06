import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Local: wrangler dev on :8787 (D1 + PIN). Azure Functions path is unused.
      '/api': 'http://127.0.0.1:8787',
    },
  },
});
