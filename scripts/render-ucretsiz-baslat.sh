#!/usr/bin/env bash
# Render ücretsiz plan için tek süreçli başlatma: ücretsiz planda Shell, preDeploy ve ayrı işçi yoktur.
# Sıra: migrasyon → (SMTP_URL varsa) e-posta kanalı → süper yönetici daveti (idempotent) → işçi + API.
# Gizli bilgi bu dosyada yoktur; değerler Render ortam değişkenlerinden okunur ve ekrana yazılmaz.
set -euo pipefail
cd "$(dirname "$0")/../apps/api"

node dist/src/cli/migrate.js

if [ -n "${SMTP_URL:-}" ]; then
  printf '%s' "$SMTP_URL" | node dist/src/cli/configure-email.js --provider "${SMTP_PROVIDER_NAME:-SMTP}" --status ACTIVE --skip-if-unchanged \
    || echo "UYARI: e-posta kanalı yapılandırılamadı (ayrıntı yukarıda)."
fi
unset SMTP_URL

if [ -n "${SUPER_ADMIN_EMAIL:-}" ]; then
  # Süper yönetici zaten varsa hiçbir şey yapmaz; yoksa davet e-postası gönderir. Başarısızlık siteyi durdurmaz.
  # SUPER_ADMIN_REISSUE_INVITE=true: hesap hâlâ "davet edildi" durumundaysa yeni davet gönderir (etkin hesapta etkisizdir).
  # Davet geldikten sonra bu değişken silinmelidir; aksi hâlde her yeniden başlatmada yeni davet gider.
  REISSUE=()
  if [ "${SUPER_ADMIN_REISSUE_INVITE:-}" = "true" ]; then REISSUE=(--reissue-invite); fi
  node dist/src/cli/bootstrap-super-admin.js "${REISSUE[@]}" || echo "UYARI: süper yönetici daveti gönderilemedi (ayrıntı yukarıda)."
fi

node dist/src/cli/worker.js &
WORKER_PID=$!
trap 'kill -TERM "$WORKER_PID" 2>/dev/null || true' TERM INT
node dist/src/server.js &
SERVER_PID=$!
trap 'kill -TERM "$SERVER_PID" "$WORKER_PID" 2>/dev/null || true' TERM INT
# Biri durursa diğeri de durdurulur; Render servisi yeniden başlatır.
wait -n "$SERVER_PID" "$WORKER_PID" || true
kill -TERM "$SERVER_PID" "$WORKER_PID" 2>/dev/null || true
wait || true
exit 1
