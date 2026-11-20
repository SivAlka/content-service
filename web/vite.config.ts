/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [vue()],
  server: { port: Number(process.env.WEB_PORT ?? 5173), strictPort: true, proxy: { '/api': apiTarget } },
  test: { environment: 'jsdom' },
});
