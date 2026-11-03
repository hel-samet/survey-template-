import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // GitHub Pages project sites live under /<repo-name>/, set via VITE_BASE.
    base: env.VITE_BASE || '/',
    server: {
      port: 5173,
    },
  };
});
