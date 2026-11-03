import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import type { FastifyInstance } from 'fastify';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

/**
 * Derlenmiş web arayüzünü (apps/web/dist) API ile aynı adresten sunar.
 * Dosya listesi başlangıçta bir kez okunur; istek yolu yalnızca bu listeyle eşleştirilir (dizin dışına çıkma olanaksızdır).
 */
export function registerWebStatic(app: FastifyInstance, dir: string) {
  const root = resolve(dir);
  const files = new Map<string, { body: Buffer; type: string; immutable: boolean }>();
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else {
        const urlPath = '/' + relative(root, full).split(sep).join('/');
        files.set(urlPath, { body: readFileSync(full), type: TYPES[extname(name)] ?? 'application/octet-stream', immutable: urlPath.startsWith('/assets/') });
      }
    }
  };
  walk(root);
  const index = files.get('/index.html');
  if (!index) throw new Error(`WEB_DIST_DIR içinde index.html yok: ${root}`);

  app.setNotFoundHandler((req, reply) => {
    const path = req.url.split('?')[0]!;
    if ((req.method !== 'GET' && req.method !== 'HEAD') || path.startsWith('/api/') || path === '/api') {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Bulunamadı.' } });
    }
    const f = files.get(path);
    if (f) return reply.type(f.type).header('cache-control', f.immutable ? 'public, max-age=31536000, immutable' : 'no-cache').send(f.body);
    // Tek sayfa uygulama: bilinmeyen yollar arayüzün kendi yönlendiricisine bırakılır
    return reply.type(index.type).header('cache-control', 'no-cache').send(index.body);
  });
}
