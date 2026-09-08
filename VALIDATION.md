> **Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.**

# MVP doğrulama kaydı

## Geçen kontroller

- RTX 3070 Ti üzerinde üç LTX profili: warm-up + 5 üretim, karar `IMAGE_MOTION`.
- LTX still yaklaşımı semantik testte 0/3 kaldı ve rekürsif bulanıklık üretti; image-motion motoru önce SD1.5 text-to-image olarak kuruldu.
- Sabit 10 komut karşılaştırması: SD1.5 10/10 üretim, G95 1,71 sn, 3,99 GB tepe VRAM, 2 net / 5 kısmi / 3 başarısız. SDXL‑Lightning 4-step 10/10 üretim, G95 2,04 sn, 7,56 GB tepe VRAM, 4 net / 4 kısmi / 2 başarısız. Final image motoru SDXL‑Lightning seçildi.
- SDXL runtime yeniden başlatma smoke: state 422’den 446’ya ilerledi; son 20 üretim p95 2,92 sn, maksimum 3,08 sn; medya HTTP 200 ve Node/Qwen/Comfy health geçti.
- Node testleri: 5/5 geçti.
- Sahte chat E2E: 3–1 sonuç doğru kazandı; aynı kullanıcının ikinci oyu reddedildi.
- Exact vote: yalnız literal `1`/`2`; boşluklu ve kimliksiz değerler reddedildi.
- WebSocket: `state`, `new_scene`, `vote_update`, `generation_started` gerçek turda alındı.
- Qwen CPU: geçerli JSON 6,6 saniye; kapalıyken güvenli havuzla tur ilerledi.
- ComfyUI kapalı: medya değişmeden iki tur ilerledi, `generation_failed` kaydı oluştu.
- ComfyUI geri açıldı: soğuk yüklemeden sonra üretim otomatik toparlandı.
- Node restart: sahne ve medya diskteki state’ten geri geldi; phase güvenli oylamaya döndü.
- Overlay WebSocket’i: Node restart sonrası 1 saniyede otomatik yeniden bağlanacak şekilde uygulandı.
- Ham chat/user ID loglanmıyor; olay logu yalnız kaynak, oy, toplam, kazanan, süre ve hata kodu içeriyor.
- OBS koleksiyonu ve profil ayrı `SonsuzYayin` adıyla kuruldu; mevcut `İsimsiz` ayarları değiştirilmedi.

## Dayanıklılık

- 60 dakikalık yerel orkestrasyon soak geçti: 716 örnek, 189 tur, 0 eksik medya, 0 istek hatası.
- Ham sonuç: `state/soak-report-60m.json`.
- SD1.5 motoruyla yapılmış 10 dakikalık smoke geçti: 120 örnek, 54 tur, 0 eksik medya/istek hatası. Bu sonuç SDXL için 10 dakikalık dayanıklılık iddiası değildir.
- Ham sonuç: `state/soak-report-sd-smoke.json`.

## Hesap sahibini bekleyen dış adımlar

- YouTube kanal live aktivasyonu.
- OAuth client/refresh token değerleri.
- Liste dışı yayın oluşturma ve sentetik içerik açıklamasını etkinleştirme.
- 20 gerçek chat mesajıyla p95 gecikme ve 10/60 dakikalık liste dışı yayın testleri.
