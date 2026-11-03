/** Web arayüzünün API ile aynı adresten sunulması (Render gibi tek servisli dağıtım). */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupApp, teardown, type TestCtx } from './helpers.js';

let t: TestCtx;
const dir = mkdtempSync(join(tmpdir(), 'su-web-'));
beforeAll(async () => {
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Su</title>');
  writeFileSync(join(dir, 'assets', 'app-abc.js'), 'console.log(1)');
  t = await setupApp({ WEB_DIST_DIR: dir });
});
afterAll(async () => teardown(t));
const get = (url: string) => t.app.inject({ method: 'GET', url });

describe('Web arayüzü sunumu', () => {
  it('kök ve uygulama içi yollar index.html döner', async () => {
    for (const u of ['/', '/fatura', '/islemler/fatura/123']) {
      const r = await get(u);
      expect(r.statusCode).toBe(200);
      expect(r.headers['content-type']).toMatch(/text\/html/);
      expect(r.body).toContain('<title>Su</title>');
    }
  });
  it('derlenmiş dosyalar doğru türle ve uzun önbellekle sunulur', async () => {
    const r = await get('/assets/app-abc.js');
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toMatch(/javascript/);
    expect(r.headers['cache-control']).toMatch(/immutable/);
  });
  it('bilinmeyen /api yolları JSON 404 kalır', async () => {
    const r = await get('/api/olmayan-yol');
    expect(r.statusCode).toBe(404);
    expect(r.json().error.code).toBe('NOT_FOUND');
  });
  it('dizin dışına çıkma denemesi dosya sızdırmaz', async () => {
    for (const u of ['/../package.json', '/%2e%2e/%2e%2e/.env', '/assets/../../package.json']) {
      const r = await get(u);
      expect(r.body).not.toContain('"dependencies"');
      expect(r.body).not.toContain('DATABASE_URL');
    }
  });
});
