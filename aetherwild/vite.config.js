import { defineConfig } from 'vite';

// Codespaces forwards the browser's hostname to Vite. Keep the allowed hosts
// scoped to the documented GitHub preview domains rather than allowing all.
export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['.app.github.dev', '.githubpreview.dev'],
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: ['.app.github.dev', '.githubpreview.dev'],
  },
});
