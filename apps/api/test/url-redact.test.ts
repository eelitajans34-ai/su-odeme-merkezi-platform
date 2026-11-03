import { describe, it, expect } from 'vitest';
import { redactUrl, serializeRequest } from '../src/lib/redact.js';

describe('günlükte adres maskeleme', () => {
  it('davet ve sıfırlama bağlantısındaki token günlüğe yazılmaz', () => {
    expect(redactUrl('/yonetici-daveti?token=AYTrjjGdACc1ud8nxq075')).toBe('/yonetici-daveti?token=[GİZLENDİ]');
    expect(redactUrl('/a?x=1&reset_token=abc&code=99')).toBe('/a?x=1&reset_token=[GİZLENDİ]&code=[GİZLENDİ]');
    expect(redactUrl('/api/health')).toBe('/api/health');
  });
  it('istek serileştiricisi maskelenmiş adresi verir', () => {
    const s = serializeRequest({ method: 'GET', url: '/yonetici-daveti?token=gizli', host: 'h', ip: '1.2.3.4', socket: { remotePort: 5 } });
    expect(s).toEqual({ method: 'GET', url: '/yonetici-daveti?token=[GİZLENDİ]', host: 'h', remoteAddress: '1.2.3.4', remotePort: 5 });
  });
});
