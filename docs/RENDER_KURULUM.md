# Render'a kurulum (Frankfurt)

Bu rehber sistemi Render üzerinde **"Kurulum bekleniyor"** durumunda yayına alır. Bu durumda hiçbir ödeme alınmaz. Ödeme kuruluşu ve su idaresi entegrasyonunu süper yönetici sonradan yönetim panelinden girer. Bunun için seçilen kurumun bağlantı modülünün, kurumun resmî API dokümanına göre yazılmış olması gerekir (bkz. ENTEGRASYON_REHBERI.md).

Kurulum dosyası depo kökündeki `render.yaml` dosyasıdır. Bu dosya gizli bilgi içermez.

## Ne kurulur

| Bileşen | Render türü | Not |
|---|---|---|
| `su-odeme-merkezi` | Web service (Node 22, starter) | API ve web arayüzü aynı adresten sunulur. Her dağıtımdan önce veritabanı migrasyonları çalışır. |
| `su-odeme-isci` | Background worker (starter) | Durum sorguları, mutabakat ve bildirimler |
| `su-odeme-db` | PostgreSQL 17 (basic-256mb) | Yalnızca Render iç ağından erişilir |

`AUTH_SECRET` ve `SECRETS_ENCRYPTION_KEY` değerlerini Render kendisi üretir; bu değerler depoya yazılmaz. Ücretler Render'ın güncel fiyat listesine bağlıdır. Plan adlarını kurulum sırasında değiştirebilirsiniz.

## Adımlar

### 1. Render hesabı ve depo bağlantısı
1. https://render.com adresinde hesap açın. Bir ödeme yöntemi ekleyin; starter planlar ücretlidir.
2. **New → Blueprint** seçin. GitHub'ı bağlayın ve `su-odeme-merkezi-platform` deposunu seçin.
3. Render `render.yaml` dosyasını okur ve sizden şu değerleri ister:

| Değişken | Ne girilir |
|---|---|
| `APP_BASE_URL` | `https://su-odeme-merkezi.onrender.com` (kendi alan adınızı bağlayacaksanız o adres) |
| `API_PUBLIC_URL` | `APP_BASE_URL` ile aynı |
| `CORS_ALLOWED_ORIGINS` | `APP_BASE_URL` ile aynı |
| `SUPER_ADMIN_EMAIL` | Süper yöneticinin e-posta adresi |
| `EMAIL_FROM` | Gönderen adı ve adresi, ör. `Su Ödeme Merkezi <bildirim@alanadiniz.com.tr>` |

4. **Apply** deyin. İlk derleme birkaç dakika sürer. `https://.../api/health` adresi `{"status":"ok"}` döndürüyorsa kurulum tamamdır.

> **Şifreleme anahtarını yedekleyin:** Render panelinde **Env Groups → su-odeme-ortak → SECRETS_ENCRYPTION_KEY** değerini bir parola yöneticisine kaydedin. Bu anahtar kaybolursa kasadaki gizli bilgiler (ödeme anahtarları, SMTP) çözülemez ve hepsinin yeniden girilmesi gerekir.

### 2. Alan adı (isteğe bağlı ama önerilir)
1. **su-odeme-merkezi → Settings → Custom Domains** bölümünden alan adınızı ekleyin. Render'ın gösterdiği DNS kaydını alan adı sağlayıcınıza girin. TLS sertifikası otomatik gelir.
2. Ardından `APP_BASE_URL`, `API_PUBLIC_URL` ve `CORS_ALLOWED_ORIGINS` değerlerini yeni adrese çevirin ve yeniden dağıtın.

### 3. E-posta (SMTP)
Süper yönetici daveti e-postayla gider, bu yüzden bu adım davetten önce yapılmalıdır.

1. Bir SMTP hesabı edinin. Kurumsal e-postanız, Brevo, Mailgun, Amazon SES gibi bir hizmet olabilir. Gönderen alan adı için SPF, DKIM ve DMARC kayıtlarını yapın.
2. **su-odeme-merkezi → Shell** sekmesinde şu komutu çalıştırın. SMTP adresi ekrana veya geçmişe yazılmasın diye `read -s` ile girilir:
   ```bash
   cd apps/api
   read -rs SMTP_URL   # smtps://kullanici:parola@sunucu:465 yazıp Enter
   printf '%s' "$SMTP_URL" | npm run configure-email:prod -- --provider "Sağlayıcı adı" --status ACTIVE
   unset SMTP_URL
   ```

### 4. Süper yönetici
Aynı Shell'de şu komutu çalıştırın:
```bash
cd apps/api && npm run bootstrap-super-admin:prod
```
- Komut, `SUPER_ADMIN_EMAIL` adresine **24 saat geçerli, tek kullanımlık** bir davet gönderir. Varsayılan parola yoktur.
- Süper yönetici davet bağlantısından parolasını belirler ve **doğrulayıcı uygulama (TOTP)** kurar. Bu adım zorunludur. 10 kurtarma kodunu güvenli bir yerde saklamalıdır.
- Komut tekrar çalıştırılırsa yeni yönetici oluşturmaz. E-posta gönderilemezse komut bunu açıkça söyler; SMTP bilgisini düzeltip `npm run bootstrap-super-admin:prod -- --reissue-invite` çalıştırın. Davetin süresi dolduğunda da aynı komut kullanılır.

### 5. Yedekleme
Render PostgreSQL günlük otomatik yedek alır; saklama süresi plana göre değişir. Yayın öncesi kontrol listesindeki "geri yükleme doğrulandı" maddesi için şu adımları izleyin:
1. Render panelinden bir yedeği **ayrı bir test veritabanına** geri yükleyin.
2. Sonucu Yönetim → Sistem ve yedekleme sayfasından kaydedin.

Bir onay kutusu kanıt sayılmaz.

## Bu kurulumdan sonra sistemin durumu
- Sitede kayıt ve giriş çalışır, abonelik eklenebilir. Su idaresi bağlı olmadığı için abonelik doğrulanamaz.
- Kart yükleme ve fatura ödemede tüm yöntemler (kart, QR, NFC) **"Kurulum bekleniyor"** görünür. Ödeme alınmaz.
- Simülatörler üretimde kapalıdır. Üst şeritteki "TEST MODU" uyarısı, canlı moda geçilene kadar görünür.
- Canlı mod; sözleşme kaydı, gerçek tarife, canlı anahtarlar ve kanıtlı yayın öncesi kontrol listesi olmadan açılamaz.

## Güncelleme ve geri alma
- `autoDeploy` kapalıdır. Yeni sürüm `main` dalına girdikten sonra Render panelinden **Manual Deploy** ile dağıtılır. Migrasyonlar dağıtımdan önce otomatik çalışır.
- Geri almak için Render'da **Deploys** listesinden önceki sürüme **Rollback** yapılır. Migrasyonlar yalnızca ileriye doğru çalıştığı için şema geri alınmaz; ayrıntı için KURULUM.md §10'a bakın.
