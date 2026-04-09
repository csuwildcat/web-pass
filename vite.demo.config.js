import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

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

export default defineConfig({
  root: path.resolve(rootDir, 'demo'),
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
  }
});
