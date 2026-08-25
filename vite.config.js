import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const demoDir = path.resolve(rootDir, 'demo');
const siteDir = path.resolve(rootDir, 'site');

export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  root: demoDir,
  server: {
    port: 5330,
    strictPort: true,
    fs: {
      allow: [rootDir]
    }
  },
  preview: {
    port: 5330,
    strictPort: true,
    host: '127.0.0.1'
  },
  build: {
    target: 'es2022',
    outDir: siteDir,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(demoDir, 'index.html'),
        connect: path.resolve(demoDir, '.well-known/web-pass.html')
      }
    }
  }
}));
