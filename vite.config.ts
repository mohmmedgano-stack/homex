import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  build: {
    rollupOptions: {
      // Two separate apps: the store (/) and the admin dashboard (/admin/)
      input: {
        store: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin/index.html'),
      },
    },
  },
  server: {
    // Local dev: forward /api to `php -S 127.0.0.1:8088 -t public`
    proxy: { '/api': 'http://127.0.0.1:8088' },
  },
}));
