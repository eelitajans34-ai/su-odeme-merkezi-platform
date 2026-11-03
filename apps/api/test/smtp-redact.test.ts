/** SMTP hata ayrıntısı günlüğe yazılırken kullanıcı adı ve parola görünmez. */
import { describe, expect, it } from 'vitest';
import { redactSmtp } from '../src/services/notifications.js';

describe('SMTP hata metni maskeleme', () => {
  it('adres, kullanıcı adı ve parola (kodlanmış ve çözülmüş) maskelenir', () => {
    const url = 'smtp://c1441a001%40smtp-brevo.com:xsmtpsib-GIZLI123@smtp-relay.brevo.com:2525';
    const msg = `EAUTH 535 Invalid login c1441a001@smtp-brevo.com xsmtpsib-GIZLI123 ${url}`;
    const out = redactSmtp(msg, url);
    expect(out).not.toContain('GIZLI123');
    expect(out).not.toContain('c1441a001');
    expect(out).toContain('EAUTH 535 Invalid login');
  });
  it('adres yoksa metin değişmez', () => {
    expect(redactSmtp('ETIMEDOUT Connection timeout', null)).toBe('ETIMEDOUT Connection timeout');
  });
});
