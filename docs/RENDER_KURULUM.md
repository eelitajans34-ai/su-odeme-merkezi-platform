# Render'a kurulum (Frankfurt, ücretsiz plan)

Bu rehber sistemi Render'ın **ücretsiz planında**, **"Kurulum bekleniyor"** durumunda yayına alır. Bu kurulumda hiçbir ödeme alınmaz. Ödeme kuruluşu ve su idaresi entegrasyonunu süper yönetici sonradan yönetim panelinden girer. Bunun için seçilen kurumun bağlantı modülünün, kurumun resmî API dokümanına göre yazılmış olması gerekir (bkz. ENTEGRASYON_REHBERI.md).

Kurulum dosyası depo kökündeki `render.yaml` dosyasıdır. Dosya gizli bilgi içermez.

## Ücretsiz planın sınırları

| Sınır | Etkisi |
|---|---|
| Ücretsiz PostgreSQL yaklaşık **30 gün** sonra sona erer | Veriler (kullanıcılar, abonelikler, süper yönetici hesabı) silinir. Yeniden kurulum aşağıda anlatılıyor. |
| Shell, preDeploy ve ayrı işçi servisi yok | Migrasyon, e-posta kanalı, süper yönetici daveti ve arka plan işçisi her açılışta `scripts/render-ucretsiz-baslat.sh` ile çalışır. Bu adımlar tekrar çalıştırılmaya dayanıklıdır, ikinci açılışta hiçbir şeyi değiştirmez. |
| 15 dakika istek gelmezse servis uyur | Sonraki ilk açılış yaklaşık 1 dakika sürer. Uyurken arka plan işleri de durur. Ödeme alınmadığı sürece bunun bir zararı yoktur. |

Bu kurulum **deneme ve tanıtım** içindir. Gerçek ödeme alınmadan önce ücretli plana geçilmelidir. Bunun için web servisi ve veritabanı planı yükseltilir, isteğe bağlı olarak işçi ayrı bir servis yapılır.

## Hazırlık: Gmail ile e-posta gönderimi

Süper yönetici daveti e-postayla gönderilir. En kolay yol bir Gmail hesabıdır:

1. Gmail hesabında **iki adımlı doğrulama** açık olmalı.
2. https://myaccount.google.com/apppasswords adresinden "Su Ödeme Merkezi" adıyla bir **uygulama şifresi** oluşturun. Google 16 harfli bir şifre gösterir. Boşlukları silip bir kenara not edin.
3. SMTP adresini şu biçimde hazırlayın. E-posta adresindeki `@` işaretini **`%40`** olarak yazın:
   ```
   smtps://ADRESINIZ%40gmail.com:UYGULAMASIFRESI@smtp.gmail.com:465
   ```
   Bu değeri hiçbir sohbete veya dosyaya yazmayın. Yalnızca Render'daki `SMTP_URL` alanına girin.

## Kurulum

1. https://dashboard.render.com adresinde **New → Blueprint** seçin ve `su-odeme-merkezi-platform` deposunu seçin. Dal `main` kalsın.
2. Render sizden şu değerleri ister:

| Değişken | Ne girilir |
|---|---|
| `APP_BASE_URL` | `https://su-odeme-merkezi.onrender.com` |
| `API_PUBLIC_URL` | aynı adres |
| `CORS_ALLOWED_ORIGINS` | aynı adres |
| `SUPER_ADMIN_EMAIL` | süper yöneticinin e-posta adresi |
| `EMAIL_FROM` | `Su Ödeme Merkezi <ADRESINIZ@gmail.com>` (Gmail'de gönderen, SMTP hesabıyla aynı olmalı) |
| `SMTP_URL` | yukarıda hazırlanan `smtps://...` adresi |

3. **Apply** deyin. İlk derleme birkaç dakika sürer. Render servise başka bir ad verdiyse (ör. `su-odeme-merkezi-abcd.onrender.com`), üç adres alanını o adrese göre düzeltin ve **Manual Deploy** yapın.
4. **Logs** sekmesinde şu satırlar görünmelidir:
   - `5 migration uygulandı.`
   - `E-posta kanalı kaydedildi (ACTIVE).`
   - `Süper yönetici daveti SUPER_ADMIN_EMAIL adresine e-posta ile gönderildi.`
5. `https://.../api/health` adresi `{"status":"ok"}` döndürmelidir.
6. Süper yönetici e-postadaki bağlantıdan (24 saat geçerli, tek kullanımlık) parolasını belirler ve **doğrulayıcı uygulama (TOTP)** kurar. Bu adım zorunludur. 10 kurtarma kodunu saklamalıdır. Varsayılan parola yoktur.
7. Davet geldikten sonra güvenlik için Render'da **Environment** bölümünden `SMTP_URL` değişkenini silebilirsiniz. Değer şifreli kasaya yazılmıştır, e-posta göndermeye devam eder.

> **Şifreleme anahtarını yedekleyin:** Render'da **Environment** bölümündeki `SECRETS_ENCRYPTION_KEY` değerini bir parola yöneticisine kaydedin. Bu anahtar kaybolursa kasadaki gizli bilgiler çözülemez.

### Davet gelmediyse
- Logs'ta "e-posta kanalı yapılandırılamadı" veya "davet gönderilemedi" yazıyorsa sorun büyük olasılıkla SMTP bilgisindedir. Sık yapılan hatalar: `%40` yazılmaması, uygulama şifresinde boşluk bırakılması, iki adımlı doğrulamanın kapalı olması.
- `SMTP_URL` değerini düzeltip **Manual Deploy** yapın.
- Süper yönetici hesabı "davet edildi" durumunda kaldıysa ya da davetin 24 saatlik süresi dolduysa: **Environment** bölümünde `SUPER_ADMIN_REISSUE_INVITE` değerini `true` yapın ve **Manual Deploy** yapın. Yeni davet geldikten sonra değeri **mutlaka `false` yapın**. Aksi hâlde servis her uyanışta yeni davet gönderir ve önceki bağlantı geçersiz olur. Hesap etkinleştirildikten sonra bu değişkenin bir etkisi yoktur.

## 30 gün sonra yeniden kurulum

Render, ücretsiz veritabanının süresi dolmadan e-posta ile uyarır.

1. Render panelinde süresi dolan `su-odeme-db` veritabanını silin.
2. **Blueprints** bölümünde kurulumu açıp **Manual Sync** deyin (veya Blueprint'i yeniden uygulayın). Yeni ve boş bir veritabanı oluşur.
3. Servisi **Manual Deploy** ile yeniden başlatın. Açılışta migrasyonlar çalışır, e-posta kanalı kurulur ve süper yöneticiye yeni bir davet gider. Bunun için `SMTP_URL` değişkeninin hâlâ tanımlı olması gerekir; daha önce sildiyseniz tekrar girin.
4. Önceki veriler geri gelmez. Kalıcı veri gerekiyorsa veritabanı ücretli plana yükseltilmelidir.

## Bu kurulumdan sonra sistemin durumu
- Sitede kayıt ve giriş çalışır, abonelik eklenebilir. Su idaresi bağlı olmadığı için abonelik doğrulanamaz.
- Kart yükleme ve fatura ödemede tüm yöntemler (kart, QR, NFC) **"Kurulum bekleniyor"** görünür. Ödeme alınmaz.
- Simülatörler üretimde kapalıdır. Üst şeritteki "TEST MODU" uyarısı canlı moda geçilene kadar görünür.
- Canlı mod; sözleşme kaydı, gerçek tarife, canlı anahtarlar ve kanıtlı yayın öncesi kontrol listesi olmadan açılamaz.

## Güncelleme ve geri alma
- `autoDeploy` kapalıdır. Yeni sürüm `main` dalına girdikten sonra Render panelinden **Manual Deploy** ile dağıtılır. Migrasyonlar açılışta otomatik çalışır.
- Geri almak için **Deploys** listesinden önceki sürüme **Rollback** yapılır. Migrasyonlar yalnızca ileriye doğru çalışır; ayrıntı için KURULUM.md §10'a bakın.
