import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Local dev: the API dev server (api/dev-server.js) plays the role of
      // the SWA-managed Functions app.
      '/api': 'http://localhost:7071',
    },
  },
});
