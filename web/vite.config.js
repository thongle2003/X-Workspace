import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createAPI } from './server/api.mjs';

export default defineConfig({
  plugins: [react(), tailwindcss(), { name:'investment-api', configureServer(server){server.middlewares.use(createAPI());}, configurePreviewServer(server){server.middlewares.use(createAPI());} }],
  server: {
    host: '127.0.0.1',
    port: 5180,
    strictPort: true,
    fs: { deny: ['.env', '.env.*', '**/.runtime/**', '**/auth.json', '**/server/**'] },
  },
});
