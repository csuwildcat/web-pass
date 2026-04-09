import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const demoDir = path.resolve(rootDir, 'demo');
const siteDir = path.resolve(rootDir, 'site');

function demoPostRedirect() {
  return {
    name: 'demo-post-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }
        const pathname = (() => {
          try {
            return new URL(req.url ?? '/', 'http://localhost').pathname;
          } catch {
            return '/';
          }
        })();
        if (pathname !== '/') {
          next();
          return;
        }
        res.statusCode = 303;
        res.setHeader('Location', '/');
        res.end();
      });
    }
  };
}

export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  root: demoDir,
  plugins: [demoPostRedirect()],
  server: {
    port: 5330,
    strictPort: true,
    fs: {
      allow: [rootDir]
    }
  },
  preview: {
    port: 5330,
    strictPort: true
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
